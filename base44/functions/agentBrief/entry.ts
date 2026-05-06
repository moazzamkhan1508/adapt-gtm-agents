import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Anthropic from 'npm:@anthropic-ai/sdk@0.27.0';

Deno.serve(async (req) => {
  try {
    const { query } = await req.json();
    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // ── 1. SEARCH CONTACT ──────────────────────────────────────────────────────
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: query }] },
          { filters: [{ propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: query }] },
          { filters: [{ propertyName: 'lastname', operator: 'CONTAINS_TOKEN', value: query }] },
          { filters: [{ propertyName: 'company', operator: 'CONTAINS_TOKEN', value: query }] },
        ],
        properties: [
          'firstname', 'lastname', 'email', 'jobtitle', 'company',
          'lifecyclestage', 'hs_last_sales_activity_date', 'phone',
          'linkedin_url', 'linkedinbio', 'hs_object_source_label',
          'hs_object_source_id', 'createdate', 'city', 'country',
          'num_associated_deals', 'hs_email_last_open_date',
        ],
        limit: 1,
      }),
    });

    const searchData = await searchRes.json();
    const contact = searchData.results?.[0];

    if (!contact) {
      return Response.json({
        contact: { name: query, hubspotFound: false, hubspotId: null, title: null, company: null, email: null, lifecycle: null },
        deals: [],
        meetings: [],
        notes: [],
        companyNews: [],
        talkingPoints: ['Introduce your solution and value proposition', 'Ask about current tools and pain points', 'Understand their buying process'],
        riskFlags: ['No HubSpot record found — verify contact details'],
        suggestedOpener: `Hi, thanks for taking the time today. I'd love to learn more about your current situation and see if we might be a good fit.`,
      });
    }

    const contactId = contact.id;
    const props = contact.properties;
    const fullName = `${props.firstname || ''} ${props.lastname || ''}`.trim();
    const company = props.company || null;

    // Detect Apollo import
    const sourceLabel = (props.hs_object_source_label || '').toLowerCase();
    const sourceId = (props.hs_object_source_id || '').toLowerCase();
    const fromApollo = sourceLabel.includes('apollo') || sourceId.includes('apollo');

    // ── 2. FETCH DEALS ─────────────────────────────────────────────────────────
    const dealsAssocRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/deals`, { headers });
    const dealsAssoc = await dealsAssocRes.json();
    const dealIds = (dealsAssoc.results || []).map(d => d.id);

    const deals = [];
    for (const dealId of dealIds.slice(0, 5)) {
      const dealRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage,amount,closedate,hs_next_step,pipeline,deal_currency_code,hs_deal_stage_probability,hs_lastmodifieddate`,
        { headers }
      );
      if (dealRes.ok) {
        const dd = await dealRes.json();
        const dp = dd.properties || {};
        deals.push({
          id: dealId,
          name: dp.dealname || 'Unnamed Deal',
          stage: dp.dealstage || 'Unknown',
          amount: dp.amount ? `$${Number(dp.amount).toLocaleString()}` : null,
          closeDate: dp.closedate ? new Date(dp.closedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
          nextStep: dp.hs_next_step || null,
          pipeline: dp.pipeline || null,
          probability: dp.hs_deal_stage_probability ? `${Math.round(dp.hs_deal_stage_probability * 100)}%` : null,
          lastModified: dp.hs_lastmodifieddate ? new Date(dp.hs_lastmodifieddate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
        });
      }
    }

    // ── 3. FETCH MEETINGS ──────────────────────────────────────────────────────
    const meetingsAssocRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/meetings`, { headers });
    const meetingsAssoc = await meetingsAssocRes.json();
    const meetingIds = (meetingsAssoc.results || []).map(m => m.id);

    const meetings = [];
    for (const meetingId of meetingIds.slice(0, 5)) {
      const mRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/meetings/${meetingId}?properties=hs_meeting_title,hs_meeting_start_time,hs_meeting_end_time,hs_meeting_outcome,hs_meeting_body,hs_internal_meeting_notes`,
        { headers }
      );
      if (mRes.ok) {
        const md = await mRes.json();
        const mp = md.properties || {};
        meetings.push({
          id: meetingId,
          title: mp.hs_meeting_title || 'Untitled Meeting',
          startTime: mp.hs_meeting_start_time ? new Date(mp.hs_meeting_start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null,
          outcome: mp.hs_meeting_outcome || null,
          notes: mp.hs_internal_meeting_notes || mp.hs_meeting_body || null,
        });
      }
    }

    // Sort meetings — most recent first
    meetings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    // ── 4. FETCH NOTES ─────────────────────────────────────────────────────────
    const notesAssocRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/notes`, { headers });
    const notesAssoc = await notesAssocRes.json();
    const noteIds = (notesAssoc.results || []).map(n => n.id);

    const notes = [];
    for (const noteId of noteIds.slice(0, 3)) {
      const nRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/notes/${noteId}?properties=hs_note_body,hs_timestamp`,
        { headers }
      );
      if (nRes.ok) {
        const nd = await nRes.json();
        const np = nd.properties || {};
        if (np.hs_note_body) {
          notes.push({
            body: np.hs_note_body,
            date: np.hs_timestamp ? new Date(np.hs_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
          });
        }
      }
    }

    // ── 5. CLAUDE AI — Company News, Talking Points, Risk Flags, Opener ────────
    const lastActivity = props.hs_last_sales_activity_date
      ? new Date(props.hs_last_sales_activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;
    const lifecycle = props.lifecyclestage || null;

    let companyNews = [];
    let talkingPoints = [];
    let riskFlags = [];
    let suggestedOpener = '';

    if (anthropic && company) {
      const contextBlob = JSON.stringify({
        contact: { name: fullName, title: props.jobtitle, company, email: props.email, lifecycle, lastActivity, fromApollo },
        deals,
        meetings: meetings.slice(0, 3).map(m => ({ title: m.title, startTime: m.startTime, outcome: m.outcome, notes: m.notes?.slice(0, 400) })),
        notes: notes.map(n => ({ body: n.body?.slice(0, 400), date: n.date })),
      });

      const aiRes = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `You are a GTM intelligence agent preparing a pre-meeting brief for a B2B sales rep.

Here is the CRM context for the upcoming meeting:
${contextBlob}

Search the web and generate a JSON response with these fields:
- companyNews: array of up to 3 objects { headline, summary, age, hot, relevance } — REAL recent news about "${company}" (funding, product launches, leadership changes, expansions). "hot" is boolean for recent < 30 days.
- talkingPoints: array of 4 sharp, specific talking points based on the CRM context and news
- riskFlags: array of up to 4 specific risk flags (deal staleness, lifecycle stage, competitor mentions in notes, etc.)
- suggestedOpener: one natural, personalised opening line referencing something specific from context or news

Return ONLY valid JSON with exactly those 4 keys. No markdown, no preamble.`,
        }],
      });

      const aiText = aiRes.content[0]?.text || '{}';
      const cleaned = aiText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      companyNews = parsed.companyNews || [];
      talkingPoints = parsed.talkingPoints || [];
      riskFlags = parsed.riskFlags || [];
      suggestedOpener = parsed.suggestedOpener || '';
    }

    // Fallback if Claude not available
    if (!talkingPoints.length) {
      talkingPoints = [
        company ? `Ask about ${company}'s current priorities and goals` : 'Ask about current business priorities',
        deals.length > 0 ? `Discuss progress on the ${deals[0].name} opportunity` : 'Explore potential use cases and fit',
        lastActivity ? `Follow up on last activity from ${lastActivity}` : 'Establish rapport and understand their situation',
        meetings.length > 0 ? `Reference insights from your last meeting: ${meetings[0].title}` : 'Ask about decision-making process and timeline',
      ];
    }
    if (!riskFlags.length) {
      if (!lastActivity) riskFlags.push('No recent sales activity recorded in HubSpot');
      if (!deals.length) riskFlags.push('No open deal — ensure qualification is on the agenda');
      if (lifecycle === 'subscriber' || lifecycle === 'lead') riskFlags.push(`Contact is still at ${lifecycle} stage — focus on moving forward`);
      if (!riskFlags.length) riskFlags.push('No major risk flags identified');
    }
    if (!suggestedOpener) {
      suggestedOpener = `Hi ${props.firstname || fullName}, thanks for making the time today. I wanted to pick up where we left off and make sure I understand your priorities.`;
    }

    // Primary deal for backward-compat display
    const primaryDeal = deals[0] ? { found: true, ...deals[0] } : { found: false, note: 'No open deal in HubSpot. Focus on discovery and qualification.' };

    return Response.json({
      contact: {
        hubspotId: contactId,
        name: fullName,
        title: props.jobtitle || null,
        company,
        email: props.email || null,
        phone: props.phone || null,
        lifecycle,
        hubspotFound: true,
        linkedinUrl: props.linkedin_url || null,
        fromApollo,
        location: [props.city, props.country].filter(Boolean).join(', ') || null,
      },
      deal: primaryDeal,
      deals,
      meetings,
      notes,
      companyNews,
      talkingPoints,
      riskFlags,
      suggestedOpener,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});