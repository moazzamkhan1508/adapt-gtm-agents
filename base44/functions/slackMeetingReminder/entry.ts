import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const hsHeaders = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // Get Slack access token
    const { accessToken: slackToken } = await base44.asServiceRole.connectors.getConnection('slack');

    const now = new Date();
    const windowStart = new Date(now.getTime() + 25 * 60 * 1000); // 25 min from now
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);   // 35 min from now

    // Fetch upcoming meetings from HubSpot in the 25-35 min window
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/meetings/search', {
      method: 'POST',
      headers: hsHeaders,
      body: JSON.stringify({
        filterGroups: [{
          filters: [
            { propertyName: 'hs_meeting_start_time', operator: 'GTE', value: windowStart.getTime().toString() },
            { propertyName: 'hs_meeting_start_time', operator: 'LTE', value: windowEnd.getTime().toString() },
          ]
        }],
        properties: [
          'hs_meeting_title', 'hs_meeting_start_time', 'hs_meeting_end_time',
          'hs_meeting_body', 'hs_internal_meeting_notes', 'hs_meeting_outcome',
          'hubspot_owner_id',
        ],
        limit: 20,
      }),
    });

    const searchData = await searchRes.json();
    const meetings = searchData.results || [];

    if (meetings.length === 0) {
      return Response.json({ sent: 0, message: 'No meetings in the 30-min window' });
    }

    const notified = [];

    for (const meeting of meetings) {
      const mp = meeting.properties;
      const meetingId = meeting.id;
      const title = mp.hs_meeting_title || 'Untitled Meeting';
      const startTime = mp.hs_meeting_start_time
        ? new Date(mp.hs_meeting_start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
        : 'Unknown time';

      // Get associated contact
      let contactName = 'Unknown', contactCompany = '', contactEmail = '', contactHubspotId = null;
      try {
        const assocRes = await fetch(
          `https://api.hubapi.com/crm/v3/objects/meetings/${meetingId}/associations/contacts`,
          { headers: hsHeaders }
        );
        if (assocRes.ok) {
          const assocData = await assocRes.json();
          const contactId = assocData.results?.[0]?.id;
          if (contactId) {
            contactHubspotId = contactId;
            const cRes = await fetch(
              `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,company,jobtitle,lifecyclestage`,
              { headers: hsHeaders }
            );
            if (cRes.ok) {
              const cData = await cRes.json();
              const cp = cData.properties || {};
              contactName = `${cp.firstname || ''} ${cp.lastname || ''}`.trim() || 'Unknown';
              contactCompany = cp.company || '';
              contactEmail = cp.email || '';
            }
          }
        }
      } catch (_) { /* keep defaults */ }

      // Get deal info for this contact
      let dealInfo = '';
      if (contactHubspotId) {
        try {
          const dealsAssocRes = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactHubspotId}/associations/deals`,
            { headers: hsHeaders }
          );
          if (dealsAssocRes.ok) {
            const dealsAssoc = await dealsAssocRes.json();
            const dealId = dealsAssoc.results?.[0]?.id;
            if (dealId) {
              const dealRes = await fetch(
                `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage,amount,closedate,hs_next_step`,
                { headers: hsHeaders }
              );
              if (dealRes.ok) {
                const dealData = await dealRes.json();
                const dp = dealData.properties || {};
                dealInfo = [
                  dp.dealname && `*Deal:* ${dp.dealname}`,
                  dp.dealstage && `*Stage:* ${dp.dealstage}`,
                  dp.amount && `*Amount:* $${Number(dp.amount).toLocaleString()}`,
                  dp.closedate && `*Close:* ${new Date(dp.closedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                  dp.hs_next_step && `*Next Step:* ${dp.hs_next_step}`,
                ].filter(Boolean).join('\n');
              }
            }
          }
        } catch (_) { /* no deal */ }
      }

      // Get meeting notes / past notes
      let notesSnippet = '';
      if (mp.hs_internal_meeting_notes || mp.hs_meeting_body) {
        const raw = (mp.hs_internal_meeting_notes || mp.hs_meeting_body).slice(0, 400);
        notesSnippet = `*Meeting Notes:*\n>${raw}`;
      }

      // Get owner email from HubSpot to look up Slack user
      let ownerEmail = null;
      if (mp.hubspot_owner_id) {
        try {
          const ownerRes = await fetch(
            `https://api.hubapi.com/crm/v3/owners/${mp.hubspot_owner_id}`,
            { headers: hsHeaders }
          );
          if (ownerRes.ok) {
            const ownerData = await ownerRes.json();
            ownerEmail = ownerData.email || null;
          }
        } catch (_) { /* no owner */ }
      }

      // Resolve Slack user by email
      let slackUserId = null;
      if (ownerEmail) {
        try {
          const slackUserRes = await fetch(
            `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(ownerEmail)}`,
            { headers: { Authorization: `Bearer ${slackToken}` } }
          );
          const slackUserData = await slackUserRes.json();
          if (slackUserData.ok) slackUserId = slackUserData.user?.id;
        } catch (_) { /* can't find user */ }
      }

      // Fall back to posting to the authorized user's own DM if owner not found
      if (!slackUserId) {
        try {
          const identityRes = await fetch('https://slack.com/api/auth.test', {
            headers: { Authorization: `Bearer ${slackToken}` }
          });
          const identityData = await identityRes.json();
          if (identityData.ok) slackUserId = identityData.user_id;
        } catch (_) { /* skip */ }
      }

      if (!slackUserId) {
        notified.push({ meetingId, title, status: 'skipped — no Slack user found' });
        continue;
      }

      // Open DM channel
      const openRes = await fetch('https://slack.com/api/conversations.open', {
        method: 'POST',
        headers: { Authorization: `Bearer ${slackToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: slackUserId }),
      });
      const openData = await openRes.json();
      const dmChannel = openData.channel?.id;

      if (!dmChannel) {
        notified.push({ meetingId, title, status: 'skipped — could not open DM' });
        continue;
      }

      // Build the Slack message blocks
      const blocks = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🗓️ Meeting in ~30 minutes', emoji: true }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${title}*\n⏰ ${startTime}`
          }
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              `*👤 Contact:* ${contactName}${contactCompany ? ` · ${contactCompany}` : ''}`,
              contactEmail ? `*📧 Email:* ${contactEmail}` : null,
            ].filter(Boolean).join('\n')
          }
        },
      ];

      if (dealInfo) {
        blocks.push({ type: 'divider' });
        blocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: `📊 *Deal Snapshot*\n${dealInfo}` }
        });
      }

      if (notesSnippet) {
        blocks.push({ type: 'divider' });
        blocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: notesSnippet }
        });
      }

      blocks.push({ type: 'divider' });
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `_Sent by Adapt GTM · HubSpot CRM · ${new Date().toLocaleTimeString()}_` }]
      });

      // Send the message
      const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${slackToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: dmChannel, blocks, text: `Meeting reminder: ${title} in ~30 minutes` }),
      });
      const msgData = await msgRes.json();

      notified.push({
        meetingId,
        title,
        contact: contactName,
        slackUserId,
        status: msgData.ok ? 'sent' : `failed: ${msgData.error}`,
      });
    }

    return Response.json({ sent: notified.filter(n => n.status === 'sent').length, details: notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});