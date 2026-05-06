Deno.serve(async (req) => {
  const hubspotToken = Deno.env.get('HUBSPOT_PRIVATE_APP_TOKEN');
  const connected = !!hubspotToken;

  return Response.json({
    status: connected ? 'ok' : 'error',
    hasHubspot: connected,
    connected,
    timestamp: new Date().toISOString(),
  });
});