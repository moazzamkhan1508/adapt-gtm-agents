function parseClaudeResponse(content) {
  const textBlocks = content.filter(b => b.type === 'text').map(b => b.text).join('');
  let cleaned = textBlocks.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) return JSON.parse(arrMatch[0]);
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
        system: `You are a HubSpot data assistant. Use search_crm_objects on contacts objectType with limit 100 and properties: firstname, lastname, email, company, jobtitle, lifecyclestage.
Filter out test contacts (names starting with TestFirst or ExampleCo).
Return ONLY a raw JSON array. No markdown. No code fences.
[{"id":"string","name":"First Last","email":"email or null","company":"company or null","title":"jobtitle or null","lifecycle":"lifecyclestage or null"}]`,
        messages: [{ role: 'user', content: 'Fetch HubSpot contacts and return as JSON array.' }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return Response.json({ error: data.error?.message || 'Anthropic API error' }, { status: 500 });

    const parsed = parseClaudeResponse(data.content);
    return Response.json({ contacts: Array.isArray(parsed) ? parsed : [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});