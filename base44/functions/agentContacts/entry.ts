import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // Fetch recently modified contacts (up to 50), including Apollo source tracking
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [],
        properties: [
          'firstname', 'lastname', 'email', 'company', 'jobtitle',
          'lifecyclestage', 'hs_object_source', 'hs_object_source_label',
          'hs_object_source_id', 'createdate', 'linkedin_url', 'linkedinbio'
        ],
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        limit: 50,
      }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.message || 'HubSpot API error' }, { status: 500 });

    const contacts = (data.results || [])
      .filter(c => {
        const name = `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim();
        return !!name;
      })
      .map(c => {
        const p = c.properties;
        // Detect Apollo-imported contacts via source label or source id
        const sourceLabel = (p.hs_object_source_label || '').toLowerCase();
        const sourceId = (p.hs_object_source_id || '').toLowerCase();
        const fromApollo = sourceLabel.includes('apollo') || sourceId.includes('apollo');

        return {
          id: c.id,
          name: `${p.firstname || ''} ${p.lastname || ''}`.trim(),
          email: p.email || null,
          company: p.company || null,
          title: p.jobtitle || null,
          lifecycle: p.lifecyclestage || null,
          fromApollo,
          linkedinUrl: p.linkedin_url || null,
          createdDate: p.createdate || null,
        };
      });

    return Response.json({ contacts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});