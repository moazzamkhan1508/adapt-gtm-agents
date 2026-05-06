Deno.serve(async (req) => {
  try {
    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const headers = { Authorization: `Bearer ${hubspotToken}`, 'Content-Type': 'application/json' };

    // Fetch open deals
    const dealsRes = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'dealstage', operator: 'NEQ', value: 'closedlost' }, { propertyName: 'dealstage', operator: 'NEQ', value: 'closedwon' }] }],
        properties: ['dealname', 'dealstage', 'amount', 'closedate', 'hs_last_sales_activity_date', 'hubspot_owner_id'],
        limit: 100,
      }),
    });

    const dealsData = await dealsRes.json();
    const rawDeals = dealsData.results || [];

    const now = Date.now();
    const STALE_DAYS = 14;

    const deals = await Promise.all(rawDeals.map(async (d) => {
      const dp = d.properties || {};

      // Get associated contact
      let contact = null, company = null;
      const assocRes = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${d.id}/associations/contacts`, { headers });
      const assocData = await assocRes.json();
      const contactId = assocData.results?.[0]?.id;
      if (contactId) {
        const cRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,company`, { headers });
        const cData = await cRes.json();
        const cp = cData.properties || {};
        contact = `${cp.firstname || ''} ${cp.lastname || ''}`.trim() || null;
        company = cp.company || null;
      }

      const lastActivity = dp.hs_last_sales_activity_date ? new Date(dp.hs_last_sales_activity_date) : null;
      const closeDate = dp.closedate ? new Date(dp.closedate) : null;
      const daysSinceActivity = lastActivity ? Math.floor((now - lastActivity.getTime()) / 86400000) : null;
      const daysToClose = closeDate ? Math.floor((closeDate.getTime() - now) / 86400000) : null;

      let flag = 'On track';
      let flagColor = 'green';

      if (daysSinceActivity !== null && daysSinceActivity > STALE_DAYS) {
        flag = `Stale — ${daysSinceActivity}d no activity`;
        flagColor = 'red';
      } else if (daysToClose !== null && daysToClose < 14 && daysToClose >= 0) {
        flag = `Closing soon — ${daysToClose}d`;
        flagColor = 'amber';
      } else if (daysToClose !== null && daysToClose < 0) {
        flag = `Overdue by ${Math.abs(daysToClose)}d`;
        flagColor = 'red';
      }

      const riskNotes = [];
      if (daysSinceActivity !== null && daysSinceActivity > STALE_DAYS) riskNotes.push(`No activity in ${daysSinceActivity} days`);
      if (daysToClose !== null && daysToClose < 0) riskNotes.push('Close date has passed');
      if (!dp.amount) riskNotes.push('No deal amount set');

      return {
        name: dp.dealname || 'Unnamed Deal',
        amount: dp.amount ? `$${Number(dp.amount).toLocaleString()}` : 'No amount',
        stage: dp.dealstage || 'Unknown',
        closeDate: closeDate ? closeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
        contact,
        company,
        flag,
        flagColor,
        riskNote: riskNotes.length > 0 ? riskNotes.join('. ') : 'No immediate risks identified.',
      };
    }));

    const totalValue = rawDeals.reduce((sum, d) => sum + Number(d.properties?.amount || 0), 0);
    const atRisk = deals.filter(d => d.flagColor === 'red').length;
    const closeDates = deals.filter(d => d.closeDate).map(d => new Date(d.closeDate));
    const nextClose = closeDates.length > 0 ? closeDates.sort((a, b) => a - b)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

    const stalePct = deals.length > 0 ? Math.round((deals.filter(d => d.flagColor === 'red').length / deals.length) * 100) : 0;
    const patterns = [
      `${deals.length} open deals totalling $${totalValue.toLocaleString()}`,
      `${atRisk} deal${atRisk !== 1 ? 's' : ''} flagged as at-risk or stale`,
      stalePct > 30 ? 'High proportion of stale deals — consider pipeline review' : 'Activity levels look reasonable across the pipeline',
    ];

    const actions = [];
    deals.filter(d => d.flagColor === 'red').slice(0, 3).forEach(d => {
      actions.push(`Follow up on "${d.name}"${d.contact ? ` with ${d.contact}` : ''} — ${d.riskNote}`);
    });
    if (actions.length === 0) actions.push('Pipeline looks healthy — maintain regular outreach cadence');

    return Response.json({
      summary: { totalDeals: deals.length, totalValue: `$${totalValue.toLocaleString()}`, atRisk, nextCloseDate: nextClose },
      deals,
      patterns,
      actions,
      forecast: `${deals.length} open deals valued at $${totalValue.toLocaleString()}. ${atRisk} at risk. Next close date: ${nextClose || 'none set'}.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});