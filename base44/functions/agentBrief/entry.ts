import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function runAI(base44, prompt) {
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        linkedinProfile: {
          type: 'object',
          properties: {
            synopsis: { type: 'string' },
            currentRole: { type: 'string' },
            previousCompanies: { type: 'array', items: { type: 'object', properties: { company: { type: 'string' }, title: { type: 'string' }, tenure: { type: 'string' } } } },
            recentActivity: { type: 'string' },
            totalExperience: { type: 'string' },
          },
        },
        companyIntel: {
          type: 'object',
          properties: {
            founded: { type: 'string' },
            size: { type: 'string' },
            revenue: { type: 'string' },
            industry: { type: 'string' },
            description: { type: 'string' },
            socialChannels: { type: 'array', items: { type: 'object', properties: { platform: { type: 'string' }, handle: { type: 'string' }, focus: { type: 'string' } } } },
            latestNews: { type: 'array', items: { type: 'object', properties: { headline: { type: 'string' }, summary: { type: 'string' }, age: { type: 'string' }, hot: { type: 'boolean' }, relevance: { type: 'string' } } } },
          },
        },
        companyNews: { type: 'array', items: { type: 'object', properties: { headline: { type: 'string' }, summary: { type: 'string' }, age: { type: 'string' }, hot: { type: 'boolean' }, relevance: { type: 'string' } } } },
        talkingPoints: { type: 'array', items: { type: 'string' } },
        riskFlags: { type: 'array', items: { type: 'string' } },
        suggestedOpener: { type: 'string' },
      },
    },
    model: 'gemini_3_1_pro',
  });
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, email, hubspotId } = await req.json();
    if (!query && !email && !hubspotId) return Response.json({ error: 'query is required' }, { status: 400 });

    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    const contactProps = [
      'firstname', 'lastname', 'email', 'jobtitle', 'company',
      'lifecyclestage', 'hs_last_sales_activity_date', 'phone',
      'linkedin_url', 'linkedinbio', 'hs_object_source_label',
      'hs_object_source_id', 'createdate', 'city', 'country',
      'num_associated_deals', 'hs_email_last_open_date',
    ];

    // ── 1. FETCH CONTACT — by ID (fastest), then email, then name search ───────
    let contact = null;

    if (hubspotId) {
      const directRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${hubspotId}?properties=${contactProps.join(',')}`,
        { headers }
      );
      if (directRes.ok) {
        const d = await directRes.json();
        contact = { id: d.id, properties: d.properties };
      }
    }

    if (!contact && email) {
      const emailRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST', headers,
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
          properties: contactProps, limit: 1,
        }),
      });
      const emailData = await emailRes.json();
      contact = emailData.results?.[0] || null;
    }

    if (!contact && query) {
      const nameParts = query.trim().split(' ');
      const filterGroups = [];
      if (nameParts.length >= 2) {
        filterGroups.push({ filters: [
          { propertyName: 'firstname', operator: 'EQ', value: nameParts[0] },
          { propertyName: 'lastname', operator: 'EQ', value: nameParts.slice(1).join(' ') },
        ]});
      }
      filterGroups.push({ filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: query }] });
      const nameRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST', headers,
        body: JSON.stringify({ filterGroups, properties: contactProps, limit: 1 }),
      });
      const nameData = await nameRes.json();
      contact = nameData.results?.[0] || null;
    }

    // ── NO HUBSPOT RECORD — enrich via AI web search ───────────────────────────
    if (!contact) {
      const parsedName = query || email || 'Unknown';
      const parsedCompany = null;

      const prompt = `You are a GTM intelligence agent preparing a pre-meeting brief for a B2B sales rep.
Contact: ${parsedName}
Note: This contact was NOT found in HubSpot CRM.

Search the web and return a JSON object with exactly these 6 keys:

1. "linkedinProfile": { "synopsis": "2-3 sentence career summary", "currentRole": "title at company", "previousCompanies": [{"company":"","title":"","tenure":""}], "recentActivity": "2-3 sentences on their LinkedIn post themes", "totalExperience": "X years" }
2. "companyIntel": { "founded": "year", "size": "employee range", "revenue": "revenue range", "industry": "sector", "description": "2 sentence overview", "socialChannels": [{"platform":"","handle":"","focus":""}], "latestNews": [{"headline":"","summary":"","age":"","hot":false,"relevance":""}] }
3. "companyNews": same array as companyIntel.latestNews
4. "talkingPoints": array of 4 sharp specific talking points
5. "riskFlags": array of up to 4 risk flags (include "No HubSpot record found — verify contact details" as first)
6. "suggestedOpener": one natural personalised opening line based on their LinkedIn or company news`;

      let linkedinProfile = null, companyIntel = null, companyNews = [], talkingPoints = [], riskFlags = [], suggestedOpener = '';

      const parsed = await runAI(base44, prompt);
      linkedinProfile = parsed.linkedinProfile || null;
      companyIntel = parsed.companyIntel || null;
      companyNews = parsed.companyNews || parsed.companyIntel?.latestNews || [];
      talkingPoints = parsed.talkingPoints?.length ? parsed.talkingPoints : ['Introduce your solution and value proposition', 'Ask about current tools and pain points', 'Understand their buying process', 'Explore decision-making process and timeline'];
      riskFlags = parsed.riskFlags?.length ? parsed.riskFlags : ['No HubSpot record found — verify contact details'];
      suggestedOpener = parsed.suggestedOpener || `Hi, thanks for taking the time today. I'd love to learn more about your current situation and see if we might be a good fit.`;

      return Response.json({
        contact: { name: parsedName, company: parsedCompany, hubspotFound: false, hubspotId: null, title: null, email: null, lifecycle: null },
        deals: [], meetings: [], notes: [],
        companyNews, linkedinProfile, companyIntel, talkingPoints, riskFlags, suggestedOpener,
      });
    }

    const contactId = contact.id;
    const props = contact.properties;
    const fullName = `${props.firstname || ''} ${props.lastname || ''}`.trim();
    const company = props.company || null;

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

    // ── 5. AI — LinkedIn, Company Intel, Talking Points, Risk Flags ────────────
    const lastActivity = props.hs_last_sales_activity_date
      ? new Date(props.hs_last_sales_activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;
    const lifecycle = props.lifecyclestage || null;

    const contextBlob = JSON.stringify({
      contact: { name: fullName, title: props.jobtitle, company, email: props.email, lifecycle, lastActivity, fromApollo },
      deals,
      meetings: meetings.slice(0, 3).map(m => ({ title: m.title, startTime: m.startTime, outcome: m.outcome, notes: m.notes?.slice(0, 400) })),
      notes: notes.map(n => ({ body: n.body?.slice(0, 400), date: n.date })),
    });

    const prompt = `You are a GTM intelligence agent preparing a pre-meeting brief for a B2B sales rep.

CRM context:
${contextBlob}

Search the web thoroughly and return a JSON object with EXACTLY these 6 keys:

1. "linkedinProfile": { "synopsis": "2-3 sentence career summary for ${fullName}", "currentRole": "title at company", "previousCompanies": [{"company":"","title":"","tenure":""}], "recentActivity": "2-3 sentences on their LinkedIn post themes", "totalExperience": "X years" }
2. "companyIntel": { "founded": "year", "size": "employee range", "revenue": "revenue range", "industry": "sector", "description": "2 sentence overview from their website", "socialChannels": [{"platform":"","handle":"","focus":""}], "latestNews": [{"headline":"","summary":"","age":"","hot":false,"relevance":""}] }
3. "companyNews": same array as companyIntel.latestNews (for backward compat)
4. "talkingPoints": array of 4 sharp specific talking points based on CRM context, LinkedIn activity, and company news
5. "riskFlags": array of up to 4 specific risk flags (deal staleness, lifecycle stage, competitor mentions, etc.)
6. "suggestedOpener": one natural personalised opening line referencing their LinkedIn activity or company news`;

    let linkedinProfile = null, companyIntel = null, companyNews = [], talkingPoints = [], riskFlags = [], suggestedOpener = '';

    const parsed = await runAI(base44, prompt);
    linkedinProfile = parsed.linkedinProfile || null;
    companyIntel = parsed.companyIntel || null;
    companyNews = parsed.companyNews || parsed.companyIntel?.latestNews || [];
    talkingPoints = parsed.talkingPoints || [];
    riskFlags = parsed.riskFlags || [];
    suggestedOpener = parsed.suggestedOpener || '';

    // Fallbacks
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
      linkedinProfile,
      companyIntel,
      talkingPoints,
      riskFlags,
      suggestedOpener,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});