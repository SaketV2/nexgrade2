const https = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceAmount, label, currency } = req.body;

    if (!priceAmount || !label) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const secretKey = process.env.STRIPE_SECRET_KEY;

    const postData = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': currency || 'aud',
      'line_items[0][price_data][unit_amount]': String(priceAmount),
      'line_items[0][price_data][product_data][name]': label,
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': `${origin}/success.html`,
      'cancel_url': `${origin}/#pricing`,
    }).toString();

    const session = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.stripe.com',
        path: '/v1/checkout/sessions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
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
      console.error('Stripe error:', session.body.error);
      return res.status(500).json({ error: session.body.error?.message || 'Stripe error' });
    }

    res.status(200).json({ sessionId: session.body.id });

  } catch (err) {
    console.error('Handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
