import { getOrder, json, requireEnabled, updateOrder } from './_checkout-core.mjs';
import { paypalFetch } from './_paypal-checkout.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const state = requireEnabled();
    if (!state.paypalConfigured) return json({ error: 'PayPal is not configured yet.' }, 503);

    const { orderId } = await request.json();
    const record = await getOrder(String(orderId || ''));
    if (!record) return json({ error: 'Prepared order not found.' }, 404);

    const value = (record.pricing.subtotalCents / 100).toFixed(2);
    const unitValue = (record.pricing.unitPriceCents / 100).toFixed(2);
    const paypalOrder = await paypalFetch('/v2/checkout/orders', {
      method: 'POST',
      headers: { 'paypal-request-id': `${record.orderId}-create` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: record.orderId,
          description: record.pricing.itemLabel.slice(0, 127),
          amount: {
            currency_code: 'USD',
            value,
            breakdown: { item_total: { currency_code: 'USD', value } },
          },
          items: [{
            name: record.pricing.itemLabel.slice(0, 127),
            quantity: String(record.pricing.purchasedQuantity),
            unit_amount: { currency_code: 'USD', value: unitValue },
            category: 'PHYSICAL_GOODS',
          }],
        }],
        payment_source: undefined,
      }),
    });

    await updateOrder(record.orderId, {
      status: 'payment_pending',
      paymentProvider: 'paypal',
      paypalOrderId: paypalOrder.id,
    });

    return json({ orderId: paypalOrder.id, recMamaOrderId: record.orderId });
  } catch (error) {
    return json({ error: error?.message || 'PayPal checkout failed.' }, error?.status || 500);
  }
};

export const config = {
  path: '/api/checkout/paypal/create',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip'] },
};
