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

    // Call Stripe API directly with fetch — no npm package needed
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[0]':              'card',
        'line_items[0][price_data][currency]':  currency || 'aud',
        'line_items[0][price_data][unit_amount]': String(priceAmount),
        'line_items[0][price_data][product_data][name]': label,
        'line_items[0][quantity]':              '1',
        'mode':                                 'payment',
        'success_url':                          `${origin}/success.html`,
        'cancel_url':                           `${origin}/#pricing`,
      }).toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error('Stripe error:', session.error);
      return res.status(500).json({ error: session.error?.message || 'Stripe error' });
    }

    res.status(200).json({ sessionId: session.id });

  } catch (err) {
    console.error('Handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
