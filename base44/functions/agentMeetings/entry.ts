Deno.serve(async (req) => {
  try {
    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ meetings: [], error: 'No HubSpot token' });

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // Fetch up to 50 meetings sorted by start time descending (most recent first)
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/meetings/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [],
        properties: [
          'hs_meeting_title', 'hs_meeting_start_time', 'hs_meeting_end_time',
          'hs_meeting_body', 'hs_internal_meeting_notes', 'hs_meeting_source',
          'hs_meeting_outcome',
        ],
        sorts: [{ propertyName: 'hs_meeting_start_time', direction: 'DESCENDING' }],
        limit: 50,
      }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ meetings: [], error: data.message || 'HubSpot error' });

    const nowDate = new Date();
    const results = data.results || [];

    // For each meeting, fetch the associated contact
    const meetings = await Promise.all(
      results
        .filter(m => m.properties.hs_meeting_start_time)
        .map(async (m) => {
          const p = m.properties;
          const startTime = new Date(p.hs_meeting_start_time);
          const isPast = startTime < nowDate;

          // Fetch associated contact
          let contact = { name: 'Unknown', email: '', company: '' };
          try {
            const assocRes = await fetch(
              `https://api.hubapi.com/crm/v3/objects/meetings/${m.id}/associations/contacts`,
              { headers }
            );
            if (assocRes.ok) {
              const assocData = await assocRes.json();
              const contactId = assocData.results?.[0]?.id;
              if (contactId) {
                const cRes = await fetch(
                  `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,company`,
                  { headers }
                );
                if (cRes.ok) {
                  const cData = await cRes.json();
                  const cp = cData.properties || {};
                  contact = {
                    name: `${cp.firstname || ''} ${cp.lastname || ''}`.trim() || 'Unknown',
                    email: cp.email || '',
                    company: cp.company || '',
                  };
                }
              }
            }
          } catch (_) { /* keep default contact */ }

          return {
            id: m.id,
            title: p.hs_meeting_title || 'Untitled Meeting',
            startTime: p.hs_meeting_start_time,
            endTime: p.hs_meeting_end_time,
            status: isPast ? 'Completed' : 'Upcoming',
            nooksNote: p.hs_internal_meeting_notes || p.hs_meeting_body || null,
            contact,
            deal: null,
            source: p.hs_meeting_source || 'CRM_UI',
          };
        })
    );

    const upcoming = meetings.filter(m => m.status === 'Upcoming').sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const past = meetings.filter(m => m.status === 'Completed').sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return Response.json({ meetings: [...upcoming, ...past] });
  } catch (error) {
    return Response.json({ meetings: [], error: error.message });
  }
});