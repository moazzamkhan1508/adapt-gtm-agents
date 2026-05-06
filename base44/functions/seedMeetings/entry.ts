import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // First, find or use Apollo-sourced contacts
    // Search for contacts with Apollo source
    const contactsRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [],
        properties: ['firstname', 'lastname', 'email', 'company', 'hs_object_source_label', 'hs_object_source_id'],
        sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
        limit: 20,
      }),
    });
    const contactsData = await contactsRes.json();
    const allContacts = contactsData.results || [];

    // Try Apollo contacts first, fall back to any contacts
    let apolloContacts = allContacts.filter(c => {
      const label = (c.properties.hs_object_source_label || '').toLowerCase();
      const srcId = (c.properties.hs_object_source_id || '').toLowerCase();
      return label.includes('apollo') || srcId.includes('apollo');
    });

    const contactPool = apolloContacts.length >= 5 ? apolloContacts : allContacts;
    if (contactPool.length === 0) {
      return Response.json({ error: 'No contacts found in HubSpot to associate meetings with' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const meetingTemplates = [
      { title: 'Discovery Call', offsetHours: 9, durationMins: 30, notes: 'Initial discovery call to understand current GTM workflow and pain points.' },
      { title: 'Product Demo', offsetHours: 10, durationMins: 45, notes: 'Live demo of the Adapt platform — focusing on HubSpot MCP integration and pre-call brief automation.' },
      { title: 'Technical Deep-Dive', offsetHours: 12, durationMins: 60, notes: 'Technical review of integration requirements, data security, and API compatibility.' },
      { title: 'Stakeholder Alignment', offsetHours: 14, durationMins: 30, notes: 'Alignment call with Head of Sales and RevOps leads to review pilot proposal.' },
      { title: 'Pilot Kickoff', offsetHours: 16, durationMins: 45, notes: 'Kick off 2-week pilot with 4 AEs. Review success metrics and onboarding timeline.' },
    ];

    const created = [];

    for (let i = 0; i < meetingTemplates.length; i++) {
      const tmpl = meetingTemplates[i];
      const contact = contactPool[i % contactPool.length];
      const contactName = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim() || 'Unknown';

      const startMs = today.getTime() + tmpl.offsetHours * 3600000;
      const endMs = startMs + tmpl.durationMins * 60000;

      // Create the engagement (meeting)
      const engRes = await fetch('https://api.hubapi.com/engagements/v1/engagements', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          engagement: {
            active: true,
            type: 'MEETING',
            timestamp: startMs,
          },
          metadata: {
            title: `${tmpl.title} — ${contactName}`,
            startTime: startMs,
            endTime: endMs,
            body: tmpl.notes,
          },
          associations: {
            contactIds: [parseInt(contact.id)],
            companyIds: [],
            dealIds: [],
            ownerIds: [],
            ticketIds: [],
          },
        }),
      });

      const engData = await engRes.json();
      if (!engRes.ok) {
        created.push({ error: engData.message, template: tmpl.title });
      } else {
        created.push({ id: engData.engagement?.id, title: `${tmpl.title} — ${contactName}`, contact: contactName });
      }
    }

    return Response.json({ success: true, created, apolloContactsFound: apolloContacts.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});