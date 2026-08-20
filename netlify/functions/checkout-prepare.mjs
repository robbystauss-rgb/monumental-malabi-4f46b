import { json, newOrderId, normalizeOrder, priceOrder, savePreparedOrder } from './_checkout-core.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const input = await request.json();
    const { order, errors } = normalizeOrder(input);
    if (errors.length) return json({ error: 'Order is incomplete.', details: errors }, 400);
    const pricing = priceOrder(order);
    const orderId = newOrderId();
    await savePreparedOrder(orderId, order, pricing);
    return json({ orderId, order, pricing });
  } catch (error) {
    return json({ error: error?.message || 'Could not prepare order.' }, 500);
  }
};

export const config = {
  path: '/api/checkout/prepare',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip'] },
};
