module.exports = async function handler(req, res) {
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${origin}/api/auth-google-callback`;

  if (!clientId) {
    return res.status(500).json({ error: 'Google client ID is not configured' });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: 'google',
  }).toString();

  res.writeHead(302, {
    Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  });
  res.end();
};
