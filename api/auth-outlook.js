module.exports = async function handler(req, res) {
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const redirectUri = `${origin}/api/auth-outlook-callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'Outlook client ID is not configured' });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile offline_access',
    response_mode: 'query',
    state: 'outlook',
  }).toString();

  res.writeHead(302, {
    Location: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`,
  });
  res.end();
};
