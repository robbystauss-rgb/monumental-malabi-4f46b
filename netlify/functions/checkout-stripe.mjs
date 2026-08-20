import { env, getOrder, json, orderMetadata, requireEnabled, updateOrder } from './_checkout-core.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const state = requireEnabled();
    if (!state.stripeConfigured) return json({ error: 'Stripe is not configured yet.' }, 503);

    const { orderId } = await request.json();
    const record = await getOrder(String(orderId || ''));
    if (!record) return json({ error: 'Prepared order not found.' }, 404);

    const secret = env('STRIPE_SECRET_KEY');
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('client_reference_id', record.orderId);
    params.append('customer_email', record.order.customerEmail);
    params.append('success_url', `${origin}/order-success.html?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${origin}/order.html?checkout=cancelled`);
    params.append('shipping_address_collection[allowed_countries][0]', 'US');
    params.append('payment_method_types[0]', 'card');
    params.append('payment_method_types[1]', 'cashapp');
    params.append('line_items[0][price_data][currency]', 'usd');
    params.append('line_items[0][price_data][unit_amount]', String(record.pricing.unitPriceCents));
    params.append('line_items[0][price_data][product_data][name]', record.pricing.itemLabel);
    params.append('line_items[0][price_data][product_data][description]', record.order.orderType === 'hat'
      ? `${record.order.colorway} · ${record.order.patchShape} · ${record.order.patchPlacement}`
      : `${record.order.patchShape} · ${record.order.patchSize}`);
    params.append('line_items[0][quantity]', String(record.pricing.purchasedQuantity));

    for (const [key, value] of Object.entries(orderMetadata(record))) {
      params.append(`metadata[${key}]`, String(value).slice(0, 500));
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const stripeData = await stripeResponse.json();
    if (!stripeResponse.ok || !stripeData?.url) {
      return json({ error: stripeData?.error?.message || 'Stripe could not create checkout.' }, stripeResponse.status || 502);
    }

    await updateOrder(record.orderId, {
      status: 'payment_pending',
      paymentProvider: 'stripe',
      stripeSessionId: stripeData.id,
    });

    return json({ url: stripeData.url, sessionId: stripeData.id, orderId: record.orderId });
  } catch (error) {
    return json({ error: error?.message || 'Stripe checkout failed.' }, error?.status || 500);
  }
};

export const config = {
  path: '/api/checkout/stripe',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip'] },
};
