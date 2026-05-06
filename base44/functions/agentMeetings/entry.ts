import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SAMPLE_MEETINGS = [
  {
    id: 'sample-1',
    title: '(Sample meeting) Discovery Call - Brian Halligan',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    endTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5 + 3600000).toISOString(),
    status: 'Completed',
    nooksNote: "Hey guys, looking forward to taking a tour of the extra tasty cupcake factory tomorrow. The customer expressed strong interest in our automation tools and mentioned pain points around manual CRM updates. They want to run a pilot with 3-4 AEs.",
    contact: { name: 'Brian Halligan', email: 'bh@hubspot.com', company: 'HubSpot' },
    source: 'CRM_UI',
  },
  {
    id: 'sample-2',
    title: '(Sample meeting) QBR - Maria Johnson',
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    endTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12 + 3600000).toISOString(),
    status: 'Completed',
    nooksNote: "Maria confirmed Q2 expansion budget is approved. She needs executive sign-off from VP of Sales. Next step: send formal proposal by end of week. She also flagged a competitor evaluation happening in parallel.",
    contact: { name: 'Maria Johnson', email: 'maria@acme.com', company: 'Acme Corp' },
    source: 'CRM_UI',
  },
  {
    id: 'sample-3',
    title: '(Sample) Intro Call - Apollo Import Contact',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 3600000).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Alex Chen', email: 'alex@ppolo.io', company: 'ppolo.io' },
    source: 'Apollo',
  },
  {
    id: 'sample-4',
    title: '(Sample) Demo - Revenue Team',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5 + 3600000).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Jordan Lee', email: 'jordan@techco.com', company: 'TechCo' },
    source: 'CRM_UI',
  },
];

Deno.serve(async (req) => {
  try {
    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) {
      return Response.json({ meetings: SAMPLE_MEETINGS });
    }

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    const res = await fetch('https://api.hubapi.com/crm/v3/objects/meetings/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [],
        properties: ['hs_meeting_title', 'hs_meeting_start_time', 'hs_meeting_end_time', 'hs_meeting_body', 'hs_internal_meeting_notes', 'hs_meeting_source'],
        sorts: [{ propertyName: 'hs_meeting_start_time', direction: 'DESCENDING' }],
        limit: 30,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.results?.length) {
      return Response.json({ meetings: SAMPLE_MEETINGS });
    }

    const now = new Date();
    const meetings = data.results
      .filter(m => m.properties.hs_meeting_start_time)
      .map(m => {
        const p = m.properties;
        const startTime = new Date(p.hs_meeting_start_time);
        const isPast = startTime < now;
        return {
          id: m.id,
          title: p.hs_meeting_title || 'Untitled Meeting',
          startTime: p.hs_meeting_start_time,
          endTime: p.hs_meeting_end_time,
          status: isPast ? 'Completed' : 'Upcoming',
          nooksNote: isPast ? (p.hs_internal_meeting_notes || p.hs_meeting_body || null) : null,
          contact: { name: 'Unknown', email: '', company: 'HubSpot' },
          source: p.hs_meeting_source || 'CRM_UI',
        };
      })
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return Response.json({ meetings: meetings.length ? meetings : SAMPLE_MEETINGS });
  } catch (error) {
    return Response.json({ meetings: SAMPLE_MEETINGS });
  }
});