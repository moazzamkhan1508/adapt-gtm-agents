const DAY = 1000 * 60 * 60 * 24;
const now = Date.now();

// 6 upcoming meetings sorted soonest-first, enriched with deal/company data from HubSpot contacts
const SAMPLE_UPCOMING = [
  {
    id: 'up-1',
    title: 'Discovery Call — Alex Chen / ppolo.io',
    startTime: new Date(now + DAY * 1 + 1000 * 60 * 60 * 10).toISOString(),
    endTime:   new Date(now + DAY * 1 + 1000 * 60 * 60 * 11).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Alex Chen', email: 'alex@ppolo.io', company: 'ppolo.io' },
    deal: { name: 'ppolo.io — Seed Expansion', stage: 'Appointment Scheduled', amount: '$18,000', closeDate: 'May 30, 2026' },
    source: 'Apollo',
  },
  {
    id: 'up-2',
    title: 'Product Demo — Jordan Lee / TechCo',
    startTime: new Date(now + DAY * 2 + 1000 * 60 * 60 * 14).toISOString(),
    endTime:   new Date(now + DAY * 2 + 1000 * 60 * 60 * 15).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Jordan Lee', email: 'jordan@techco.com', company: 'TechCo' },
    deal: { name: 'TechCo — Enterprise Pilot', stage: 'Demo Scheduled', amount: '$42,000', closeDate: 'Jun 15, 2026' },
    source: 'CRM_UI',
  },
  {
    id: 'up-3',
    title: 'QBR Prep — Samantha Park / Eon.io',
    startTime: new Date(now + DAY * 3 + 1000 * 60 * 60 * 9).toISOString(),
    endTime:   new Date(now + DAY * 3 + 1000 * 60 * 60 * 10).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Samantha Park', email: 'sam@eon.io', company: 'Eon.io' },
    deal: { name: 'Eon.io — Q2 Expansion', stage: 'Proposal Sent', amount: '$75,000', closeDate: 'Jun 1, 2026' },
    source: 'Apollo',
  },
  {
    id: 'up-4',
    title: 'Champion Call — Ryan Ortiz / Generate Capital',
    startTime: new Date(now + DAY * 5 + 1000 * 60 * 60 * 11).toISOString(),
    endTime:   new Date(now + DAY * 5 + 1000 * 60 * 60 * 12).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Ryan Ortiz', email: 'rortiz@generate.com', company: 'Generate Capital' },
    deal: { name: 'Generate Capital — Solar Portfolio', stage: 'Contract Sent', amount: '$120,000', closeDate: 'May 28, 2026' },
    source: 'CRM_UI',
  },
  {
    id: 'up-5',
    title: 'Security Review — Priya Nair / Apex Fintech',
    startTime: new Date(now + DAY * 7 + 1000 * 60 * 60 * 15).toISOString(),
    endTime:   new Date(now + DAY * 7 + 1000 * 60 * 60 * 16).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Priya Nair', email: 'priya@apexfintech.com', company: 'Apex Fintech' },
    deal: { name: 'Apex Fintech — Compliance Suite', stage: 'Decision Maker Bought-In', amount: '$95,000', closeDate: 'Jul 10, 2026' },
    source: 'Apollo',
  },
  {
    id: 'up-6',
    title: 'Exec Alignment — Marcus Webb / Vanta Growth',
    startTime: new Date(now + DAY * 10 + 1000 * 60 * 60 * 13).toISOString(),
    endTime:   new Date(now + DAY * 10 + 1000 * 60 * 60 * 14).toISOString(),
    status: 'Upcoming',
    nooksNote: null,
    contact: { name: 'Marcus Webb', email: 'mwebb@vantagrowth.com', company: 'Vanta Growth' },
    deal: { name: 'Vanta Growth — GTM Platform', stage: 'Appointment Scheduled', amount: '$60,000', closeDate: 'Jun 30, 2026' },
    source: 'CRM_UI',
  },
];

const SAMPLE_PAST = [
  {
    id: 'past-1',
    title: '(Sample meeting) Discovery Call — Brian Halligan',
    startTime: new Date(now - DAY * 5).toISOString(),
    endTime:   new Date(now - DAY * 5 + 3600000).toISOString(),
    status: 'Completed',
    nooksNote: "Hey guys, looking forward to taking a tour of the extra tasty cupcake factory tomorrow. The customer expressed strong interest in our automation tools and mentioned pain points around manual CRM updates. They want to run a pilot with 3-4 AEs.",
    contact: { name: 'Brian Halligan', email: 'bh@hubspot.com', company: 'HubSpot' },
    deal: { name: 'HubSpot — Platform Renewal', stage: 'Closed Won', amount: '$50,000', closeDate: 'Apr 30, 2026' },
    source: 'CRM_UI',
  },
  {
    id: 'past-2',
    title: '(Sample meeting) QBR — Maria Johnson',
    startTime: new Date(now - DAY * 12).toISOString(),
    endTime:   new Date(now - DAY * 12 + 3600000).toISOString(),
    status: 'Completed',
    nooksNote: "Maria confirmed Q2 expansion budget is approved. She needs executive sign-off from VP of Sales. Next step: send formal proposal by end of week. She also flagged a competitor evaluation happening in parallel.",
    contact: { name: 'Maria Johnson', email: 'maria@acme.com', company: 'Acme Corp' },
    deal: { name: 'Acme Corp — Enterprise Expansion', stage: 'Closed Won', amount: '$85,000', closeDate: 'Apr 20, 2026' },
    source: 'CRM_UI',
  },
];

const SAMPLE_MEETINGS = [
  ...SAMPLE_UPCOMING.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
  ...SAMPLE_PAST.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
];

Deno.serve(async (req) => {
  try {
    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ meetings: SAMPLE_MEETINGS });

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
    if (!res.ok || !data.results?.length) return Response.json({ meetings: SAMPLE_MEETINGS });

    const nowDate = new Date();
    const hubspotMeetings = data.results
      .filter(m => m.properties.hs_meeting_start_time)
      .map(m => {
        const p = m.properties;
        const startTime = new Date(p.hs_meeting_start_time);
        const isPast = startTime < nowDate;
        return {
          id: m.id,
          title: p.hs_meeting_title || 'Untitled Meeting',
          startTime: p.hs_meeting_start_time,
          endTime: p.hs_meeting_end_time,
          status: isPast ? 'Completed' : 'Upcoming',
          nooksNote: isPast ? (p.hs_internal_meeting_notes || p.hs_meeting_body || null) : null,
          contact: { name: 'Unknown', email: '', company: 'HubSpot' },
          deal: null,
          source: p.hs_meeting_source || 'CRM_UI',
        };
      });

    // Always include sample upcoming meetings + real HubSpot past meetings
    const allMeetings = [...SAMPLE_UPCOMING, ...hubspotMeetings.filter(m => m.status === 'Completed')];
    const upcoming = allMeetings.filter(m => m.status === 'Upcoming').sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const past = allMeetings.filter(m => m.status === 'Completed').sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    return Response.json({ meetings: [...upcoming, ...past] });
  } catch (error) {
    return Response.json({ meetings: SAMPLE_MEETINGS });
  }
});