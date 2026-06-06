const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceAmount, label, currency } = req.body;

    if (!priceAmount || !label) {
      return res.status(400).json({ error: 'Missing priceAmount or label' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency || 'aud',
            product_data: { name: label },
            unit_amount: priceAmount, // in cents, e.g. 5500 = $55.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success.html`,
      cancel_url:  `${req.headers.origin}/#pricing`,
    });

    res.status(200).json({ sessionId: session.id });

  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
