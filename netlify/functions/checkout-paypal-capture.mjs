import { getOrder, json, requireEnabled, updateOrder } from './_checkout-core.mjs';
import { paypalFetch } from './_paypal-checkout.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    requireEnabled();
    const { orderId, recMamaOrderId } = await request.json();
    const record = await getOrder(String(recMamaOrderId || ''));
    if (!record || !orderId || record.paypalOrderId !== orderId) {
      return json({ error: 'PayPal order does not match the prepared REC Mama Made order.' }, 400);
    }

    const captured = await paypalFetch(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: { 'paypal-request-id': `${record.orderId}-capture` },
      body: '{}',
    });

    const capture = captured?.purchase_units?.[0]?.payments?.captures?.[0];
    const completed = captured?.status === 'COMPLETED' || capture?.status === 'COMPLETED';
    if (!completed) return json({ error: 'PayPal payment was not completed.', paypalStatus: captured?.status || null }, 409);

    await updateOrder(record.orderId, {
      status: 'paid',
      paymentProvider: 'paypal',
      paypalOrderId: orderId,
      paypalCaptureId: capture?.id || null,
      paidAt: new Date().toISOString(),
    });

    return json({
      paid: true,
      orderId: record.orderId,
      provider: 'paypal',
      paypalOrderId: orderId,
    });
  } catch (error) {
    return json({ error: error?.message || 'Could not capture PayPal payment.' }, error?.status || 500);
  }
};

export const config = {
  path: '/api/checkout/paypal/capture',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip'] },
};
