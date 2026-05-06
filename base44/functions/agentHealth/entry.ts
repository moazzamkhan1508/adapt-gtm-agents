Deno.serve(async (req) => {
  const hasApiKey = !!Deno.env.get('ANTHROPIC_API_KEY');
  const hasHubspot = !!Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
  return Response.json({
    status: 'ok',
    hasApiKey,
    hasHubspot,
    connected: hasApiKey && hasHubspot,
    timestamp: new Date().toISOString(),
  });
});