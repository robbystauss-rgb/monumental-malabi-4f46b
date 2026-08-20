import { env, getOrder, json, updateOrder } from './_checkout-core.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id') || '';
    if (!sessionId.startsWith('cs_')) return json({ error: 'Invalid Stripe session.' }, 400);
    const secret = env('STRIPE_SECRET_KEY');
    if (!secret) return json({ error: 'Stripe is not configured.' }, 503);

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: `Bearer ${secret}` },
    });
    const session = await response.json();
    if (!response.ok) return json({ error: session?.error?.message || 'Could not verify Stripe payment.' }, response.status);

    const orderId = session.client_reference_id || session.metadata?.order_id || '';
    const record = await getOrder(orderId);
    if (!record || record.stripeSessionId !== sessionId) return json({ error: 'Stripe session does not match a prepared order.' }, 409);

    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (paid && record.status !== 'paid') {
      await updateOrder(orderId, {
        status: 'paid',
        paymentProvider: 'stripe',
        stripeSessionId: sessionId,
        stripePaymentStatus: session.payment_status,
        paidAt: new Date().toISOString(),
      });
    }

    return json({
      paid,
      orderId,
      provider: 'stripe',
      paymentStatus: session.payment_status || null,
      customerEmail: record.order.customerEmail,
      fulfilledQuantity: record.pricing.fulfilledQuantity,
      subtotalCents: record.pricing.subtotalCents,
    });
  } catch (error) {
    return json({ error: error?.message || 'Payment verification failed.' }, 500);
  }
};

export const config = {
  path: '/api/checkout/stripe/status',
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip'] },
};
