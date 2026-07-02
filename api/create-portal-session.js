const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId } = req.body || {};
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe secret key is not configured' });
  }

  if (!customerId) {
    return res.status(400).json({ error: 'Stripe customer ID is required' });
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2023-08-16' });
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://nexgrade2.vercel.app/account.html?auth=google',
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-portal-session error:', error);
    return res.status(500).json({ error: error.message || 'Unable to create billing portal session' });
  }
};
