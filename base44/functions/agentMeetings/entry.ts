import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // Fetch meetings (engagements type MEETING) - get recent 100
    const engRes = await fetch('https://api.hubapi.com/crm/v3/objects/meetings/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [],
        properties: [
          'hs_meeting_title', 'hs_meeting_start_time', 'hs_meeting_end_time',
          'hs_meeting_outcome', 'hs_meeting_body', 'hs_timestamp',
          'hs_meeting_location', 'hs_meeting_source', 'hs_meeting_source_id',
          'hubspot_owner_id', 'hs_internal_meeting_notes'
        ],
        sorts: [{ propertyName: 'hs_meeting_start_time', direction: 'DESCENDING' }],
        limit: 100,
      }),
    });

    const engData = await engRes.json();
    if (!engRes.ok) return Response.json({ error: engData.message || 'HubSpot meetings error' }, { status: 500 });

    const now = Date.now();
    const meetings = [];

    for (const m of (engData.results || [])) {
      const p = m.properties;
      const startMs = p.hs_meeting_start_time ? new Date(p.hs_meeting_start_time).getTime() : null;
      const endMs = p.hs_meeting_end_time ? new Date(p.hs_meeting_end_time).getTime() : null;

      // Determine status
      let status = 'upcoming';
      if (p.hs_meeting_outcome) {
        status = p.hs_meeting_outcome.toLowerCase(); // COMPLETED, CANCELED, NO_SHOW, etc.
      } else if (endMs && endMs < now) {
        status = 'completed';
      } else if (startMs && startMs < now) {
        status = 'in_progress';
      }

      // Fetch associated contacts for this meeting
      let contactName = null, contactEmail = null, company = null, contactId = null;
      try {
        const assocRes = await fetch(`https://api.hubapi.com/crm/v3/objects/meetings/${m.id}/associations/contacts`, { headers });
        const assocData = await assocRes.json();
        const firstContact = assocData.results?.[0];
        if (firstContact) {
          contactId = firstContact.id;
          const cRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,company`, { headers });
          const cData = await cRes.json();
          const cp = cData.properties || {};
          contactName = `${cp.firstname || ''} ${cp.lastname || ''}`.trim() || null;
          contactEmail = cp.email || null;
          company = cp.company || null;
        }
      } catch (_) {}

      meetings.push({
        id: m.id,
        title: p.hs_meeting_title || 'Meeting',
        startTime: p.hs_meeting_start_time || null,
        endTime: p.hs_meeting_end_time || null,
        outcome: p.hs_meeting_outcome || null,
        status,
        notes: p.hs_meeting_body || p.hs_internal_meeting_notes || null,
        location: p.hs_meeting_location || null,
        source: p.hs_meeting_source || null,
        contactName,
        contactEmail,
        contactId,
        company,
      });
    }

    // Sort: upcoming first (soonest), then past (most recent)
    const upcoming = meetings
      .filter(m => m.status === 'upcoming' || m.status === 'in_progress' || m.status === 'scheduled')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const past = meetings
      .filter(m => !upcoming.includes(m))
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return Response.json({ upcoming, past, total: meetings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});