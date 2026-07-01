const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId, returnUrl } = req.body || {};
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const customer = customerId || process.env.STRIPE_CUSTOMER_ID;
    const portalReturnUrl = returnUrl || `${origin}/account.html`;

    if (!secretKey) {
      return res.status(500).json({ error: 'Stripe secret key is not configured' });
    }

    if (!customer) {
      return res.status(400).json({ error: 'Stripe customer ID is required' });
    }

    const postData = new URLSearchParams({
      customer,
      return_url: portalReturnUrl,
    }).toString();

    const session = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.stripe.com',
        path: '/v1/billing_portal/sessions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          try {
            resolve({ body: JSON.parse(data), status: response.statusCode });
          } catch (e) {
            reject(new Error('Failed to parse Stripe response'));
          }
        });
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    if (session.status !== 200) {
      console.error('Stripe billing portal error:', session.body.error);
      return res.status(500).json({ error: session.body.error?.message || 'Stripe billing portal error' });
    }

    res.status(200).json({ url: session.body.url });
  } catch (err) {
    console.error('Portal session handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
