Deno.serve(async (req) => {
  try {
    const { query } = await req.json();
    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // Search for contact by name or email
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
        properties: ['firstname', 'lastname', 'email', 'jobtitle', 'company', 'lifecyclestage', 'hs_last_sales_activity_date'],
        limit: 1,
      }),
    });

    const searchData = await searchRes.json();
    const contact = searchData.results?.[0];

    if (!contact) {
      return Response.json({
        contact: { name: query, hubspotFound: false, hubspotId: null, title: null, company: null, email: null, lifecycle: null },
        deal: { found: false, note: 'Contact not found in HubSpot. Focus on discovery.' },
        companyNews: [],
        talkingPoints: ['Introduce your solution and value proposition', 'Ask about current tools and pain points', 'Understand their buying process'],
        riskFlags: ['No HubSpot record found — verify contact details'],
        suggestedOpener: `Hi, thanks for taking the time today. I'd love to learn more about your current situation and see if we might be a good fit.`,
      });
    }

    const contactId = contact.id;
    const props = contact.properties;
    const fullName = `${props.firstname || ''} ${props.lastname || ''}`.trim();

    // Fetch associated deals
    const dealsRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/deals`, { headers });
    const dealsAssoc = await dealsRes.json();
    const dealIds = (dealsAssoc.results || []).map(d => d.id);

    let deal = { found: false, note: 'No open deal in HubSpot. Focus on discovery and qualification.' };

    if (dealIds.length > 0) {
      const dealRes = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealIds[0]}?properties=dealname,dealstage,amount,closedate,hs_next_step`, { headers });
      const dealData = await dealRes.json();
      const dp = dealData.properties || {};
      deal = {
        found: true,
        name: dp.dealname || 'Unnamed Deal',
        stage: dp.dealstage || 'Unknown',
        amount: dp.amount ? `$${Number(dp.amount).toLocaleString()}` : null,
        closeDate: dp.closedate ? new Date(dp.closedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
        nextStep: dp.hs_next_step || null,
      };
    }

    const lifecycle = props.lifecyclestage || null;
    const company = props.company || null;
    const lastActivity = props.hs_last_sales_activity_date
      ? new Date(props.hs_last_sales_activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;

    const talkingPoints = [
      company ? `Ask about ${company}'s current priorities and goals` : 'Ask about current business priorities',
      deal.found ? `Discuss progress on the ${deal.name} opportunity` : 'Explore potential use cases and fit',
      lastActivity ? `Follow up on last activity from ${lastActivity}` : 'Establish rapport and understand their situation',
    ];

    const riskFlags = [];
    if (!lastActivity) riskFlags.push('No recent sales activity recorded in HubSpot');
    if (!deal.found) riskFlags.push('No open deal — ensure qualification is on the agenda');
    if (lifecycle === 'subscriber' || lifecycle === 'lead') riskFlags.push(`Contact is still at ${lifecycle} stage — focus on moving forward`);

    return Response.json({
      contact: {
        hubspotId: contactId,
        name: fullName,
        title: props.jobtitle || null,
        company,
        email: props.email || null,
        lifecycle,
        hubspotFound: true,
      },
      deal,
      companyNews: [],
      talkingPoints,
      riskFlags: riskFlags.length > 0 ? riskFlags : ['No major risk flags identified'],
      suggestedOpener: `Hi ${props.firstname || fullName}, thanks for making the time today. I wanted to pick up where we left off and make sure I understand your priorities so I can show you the most relevant parts of what we do.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});