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
    const { transcript, contact } = await req.json();
    if (!transcript) return Response.json({ error: 'transcript is required' }, { status: 400 });

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
        system: `You are a post-call follow-up agent for a B2B SaaS GTM team.
Read the call transcript and extract structured insights.
Return ONLY raw JSON. No markdown. No code fences.
{
  "contact": "string",
  "painPoints": ["string"],
  "commitments": ["string"],
  "nextStep": "string",
  "nextStepDate": "string or null",
  "emailDraft": "full email text with Subject: line at top",
  "hubspotUpdates": ["string"]
}`,
        messages: [{ role: 'user', content: `Analyse this call transcript for ${contact || 'the contact'} and generate a post-call follow-up:\n\n${transcript}` }],
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