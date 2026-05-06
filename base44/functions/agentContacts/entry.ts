Deno.serve(async (req) => {
  try {
    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    // Use search endpoint to sort by last modified date
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filterGroups: [],
        properties: ['firstname', 'lastname', 'email', 'company', 'jobtitle', 'lifecyclestage'],
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        limit: 10,
      }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.message || 'HubSpot API error' }, { status: 500 });

    const contacts = (data.results || [])
      .filter(c => {
        const name = `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim();
        return name && !name.startsWith('TestFirst') && !name.startsWith('ExampleCo');
      })
      .map(c => ({
        id: c.id,
        name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim(),
        email: c.properties.email || null,
        company: c.properties.company || null,
        title: c.properties.jobtitle || null,
        lifecycle: c.properties.lifecyclestage || null,
      }));

    return Response.json({ contacts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});