const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  const userEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ error: 'Stripe secret key is not configured' });
  }

  if (!userEmail) {
    return res.status(400).json({ error: 'Google email is required' });
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2023-08-16' });
    const customerList = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customer = customerList.data[0];

    if (!customer) {
      customer = await stripe.customers.create({ email: userEmail });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      expand: ['data.items.data.price.product'],
      limit: 100,
    });

    const activeSubscriptions = Array.isArray(subscriptions.data) ? subscriptions.data : [];
    const hasActiveSubscription = activeSubscriptions.length > 0;

    const subscriptionDetails = activeSubscriptions.map(subscription => {
      const item = subscription.items?.data?.[0];
      const price = item?.price;
      const product = price?.product;
      const productName = product?.name || price?.nickname || 'Tutoring subscription';
      const tier = price?.nickname || `${price?.recurring?.interval || 'standard'} plan`;
      const nextBillingTimestamp = subscription.current_period_end || subscription.current_period_start;
      const nextBillingDate = nextBillingTimestamp
        ? new Date(nextBillingTimestamp * 1000).toISOString().split('T')[0]
        : null;

      return {
        subscriptionId: subscription.id,
        productName,
        tier,
        status: subscription.status,
        nextBillingDate,
        currentPeriodEnd: nextBillingTimestamp,
      };
    });

    return res.status(200).json({
      customerId: customer.id,
      hasActiveSubscription,
      subscriptionDetails,
    });
  } catch (error) {
    console.error('get-customer-status error:', error);
    return res.status(500).json({ error: error.message || 'Unable to fetch Stripe customer status' });
  }
};
