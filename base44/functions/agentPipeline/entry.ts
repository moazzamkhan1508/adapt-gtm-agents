function parseClaudeResponse(content) {
  const textBlocks = content.filter(b => b.type === 'text').map(b => b.text).join('');
  let cleaned = textBlocks.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse JSON from response');
  }
}

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
    if (!hubspotToken) return Response.json({ error: 'HUBSPOT_PRIVATE_APP_TOKEN not set' }, { status: 500 });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-1.0',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        mcp_servers: [
          {
            type: 'url',
            url: 'https://mcp.hubspot.com/anthropic',
            name: 'hubspot',
            authorization_token: hubspotToken,
          }
        ],
        tools: [
          { type: 'web_search_20250305', name: 'web_search' }
        ],
        system: `You are a pipeline health monitor for a B2B SaaS Head of Sales.
Use HubSpot MCP to fetch ALL open deals with: dealname, dealstage, amount, closedate, hs_last_sales_activity_date, hubspot_owner_id.
For each deal look up the associated contact name and company.
Use web_search to find recent news about each company that might affect the deal.
Analyse the full pipeline for stale deals, risks, and patterns.
Return ONLY raw JSON. No markdown. No code fences.
{
  "summary": { "totalDeals":0, "totalValue":"$0", "atRisk":0, "nextCloseDate":"string or null" },
  "deals": [{
    "name":"string", "amount":"string", "stage":"string", "closeDate":"string",
    "contact":"string or null", "company":"string or null",
    "flag":"string", "flagColor":"red|amber|green", "riskNote":"string"
  }],
  "patterns": ["string"],
  "actions": ["string"],
  "forecast": "string"
}`,
        messages: [{ role: 'user', content: 'Run a full pipeline health scan. Fetch all open HubSpot deals, analyse risk, generate Monday digest.' }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return Response.json({ error: data.error?.message || 'Anthropic API error' }, { status: 500 });

    const parsed = parseClaudeResponse(data.content);
    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});