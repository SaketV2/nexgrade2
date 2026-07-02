module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;
  const requestUrl = new URL(req.url, origin);
  const code = requestUrl.searchParams.get('code');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth-google-callback`;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Google client credentials are not configured' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Google token exchange failed', tokenData);
      return res.status(500).json({ error: tokenData.error_description || 'Google token exchange failed' });
    }

    const accessToken = tokenData.access_token;
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok || !userData.email_verified) {
      console.error('Google user info failed', userData);
      return res.status(500).json({ error: 'Unable to verify Google email address' });
    }

    const normalizedEmail = userData.email.trim().toLowerCase();
    const redirectUrl = `${origin}/account.html?auth=google&email=${encodeURIComponent(normalizedEmail)}`;

    res.writeHead(302, {
      Location: redirectUrl,
    });
    res.end();
  } catch (error) {
    console.error('Google auth callback error:', error);
    res.status(500).json({ error: error.message || 'Google authentication failed' });
  }
};
