import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const { query } = await req.json();
    if (!query) return Response.json({ error: 'query is required' }, { status: 400 });

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
        system: `You are a pre-meeting intelligence agent for a B2B SaaS GTM team.
Given a contact name, email, or company:
1. Use HubSpot MCP search_crm_objects on contacts to find the contact. Get: firstname, lastname, email, jobtitle, company, lifecyclestage, hs_last_sales_activity_date.
2. Use HubSpot MCP search_crm_objects on deals with associatedWith for the contact ID. Get: dealname, dealstage, amount, closedate.
3. Use web_search to find 2-3 recent news items (last 6 months) about their company.
4. Synthesise into a structured brief.
Return ONLY raw JSON. No markdown. No code fences.
{
  "contact": { "hubspotId":"string", "name":"string", "title":"string or null", "company":"string or null", "email":"string or null", "lifecycle":"string or null", "hubspotFound":true },
  "deal": { "found":false, "name":null, "stage":null, "amount":null, "closeDate":null, "nextStep":null, "note":"First meeting — focus on discovery." },
  "companyNews": [{ "headline":"string", "age":"string", "hot":false, "summary":"string", "relevance":"string" }],
  "talkingPoints": ["string"],
  "riskFlags": ["string"],
  "suggestedOpener": "string"
}`,
        messages: [{ role: 'user', content: `Generate a pre-meeting brief for: ${query}` }],
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