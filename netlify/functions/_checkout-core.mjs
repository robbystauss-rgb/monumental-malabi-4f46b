import { getStore } from '@netlify/blobs';

const ORDER_STORE = 'rec-mama-checkout-orders';
const MODEL_PRICE_CENTS = {
  '112': 3000,
  '112PM': 3000,
  '112P': 3000,
  '112PFP': 3000,
  '168': 3500,
  '168P': 3500,
  '256': 3500,
  '256P': 3500,
};

export function env(name) {
  return (globalThis.Netlify?.env?.get(name) || '').trim();
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function positiveInt(value, fallback = 1) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 250) : fallback;
}

export function normalizeOrder(input = {}) {
  const orderType = input.orderType === 'patch' ? 'patch' : 'hat';
  const quantity = positiveInt(input.quantity, 1);
  const customerName = clean(input.customerName, 120);
  const customerEmail = clean(input.customerEmail, 180).toLowerCase();
  const family = clean(input.family, 20);
  const colorway = clean(input.colorway, 160);
  const patchShape = clean(input.patchShape, 80);
  const patchSize = clean(input.patchSize, 80);
  const patchPlacement = clean(input.patchPlacement, 80);
  const patchText = clean(input.patchText, 300);
  const orderNotes = clean(input.orderNotes, 1500);
  const artworkName = clean(input.artworkName, 220);

  const errors = [];
  if (!customerName) errors.push('Customer name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) errors.push('A valid email is required.');
  if (!patchText && !artworkName) errors.push('Artwork or patch text is required.');
  if (orderType === 'hat') {
    if (!MODEL_PRICE_CENTS[family]) errors.push('Choose a supported hat model.');
    if (!colorway) errors.push('Choose a hat colorway.');
  }

  return {
    order: {
      orderType,
      customerName,
      customerEmail,
      family,
      colorway,
      patchShape,
      patchSize,
      patchPlacement,
      patchText,
      orderNotes,
      artworkName,
      quantity,
    },
    errors,
  };
}

export function priceOrder(order) {
  const quantity = positiveInt(order.quantity, 1);
  if (order.orderType === 'patch') {
    const unitPriceCents = 500;
    return {
      currency: 'usd',
      unitPriceCents,
      purchasedQuantity: quantity,
      bonusQuantity: 0,
      fulfilledQuantity: quantity,
      subtotalCents: unitPriceCents * quantity,
      itemLabel: 'Custom engraved leatherette patch',
    };
  }

  const unitPriceCents = MODEL_PRICE_CENTS[order.family];
  if (!unitPriceCents) throw new Error('Unsupported hat model.');
  const bonusQuantity = Math.floor(quantity / 12);
  return {
    currency: 'usd',
    unitPriceCents,
    purchasedQuantity: quantity,
    bonusQuantity,
    fulfilledQuantity: quantity + bonusQuantity,
    subtotalCents: unitPriceCents * quantity,
    itemLabel: `Custom Richardson ${order.family} leather patch hat`,
  };
}

export function newOrderId() {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `RMM-${date}-${suffix}`;
}

export async function savePreparedOrder(orderId, order, pricing) {
  const store = getStore(ORDER_STORE, { consistency: 'strong' });
  const now = new Date().toISOString();
  const record = {
    orderId,
    status: 'prepared',
    order,
    pricing,
    createdAt: now,
    updatedAt: now,
  };
  await store.setJSON(orderId, record);
  return record;
}

export async function getOrder(orderId) {
  if (!orderId) return null;
  const store = getStore(ORDER_STORE, { consistency: 'strong' });
  return await store.get(orderId, { type: 'json' });
}

export async function updateOrder(orderId, updates = {}) {
  const current = await getOrder(orderId);
  if (!current) return null;
  const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
  const store = getStore(ORDER_STORE, { consistency: 'strong' });
  await store.setJSON(orderId, next);
  return next;
}

export function checkoutState() {
  const enabled = env('CHECKOUT_ENABLED').toLowerCase() === 'true';
  return {
    enabled,
    stripeConfigured: Boolean(env('STRIPE_SECRET_KEY')),
    paypalConfigured: Boolean(env('PAYPAL_CLIENT_ID') && env('PAYPAL_CLIENT_SECRET')),
    paypalMode: env('PAYPAL_MODE').toLowerCase() === 'live' ? 'live' : 'sandbox',
  };
}

export function requireEnabled() {
  const state = checkoutState();
  if (!state.enabled) {
    const error = new Error('Checkout is not live yet. Merchant payment setup is still being completed.');
    error.status = 503;
    throw error;
  }
  return state;
}

export function orderMetadata(record) {
  const o = record.order;
  const p = record.pricing;
  return {
    order_id: record.orderId,
    order_type: o.orderType,
    hat_model: o.family || 'patch-only',
    colorway: o.colorway || '',
    patch_shape: o.patchShape || '',
    patch_size: o.patchSize || '',
    patch_placement: o.patchPlacement || '',
    artwork_name: o.artworkName || '',
    bonus_qty: String(p.bonusQuantity || 0),
    fulfilled_qty: String(p.fulfilledQuantity || p.purchasedQuantity),
  };
}
