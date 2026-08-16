import { json, requireConnectorAuth, resolveMyShop, etsyFetch, safeError } from './_etsy.mjs';

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  try {
    const url = new URL(request.url);
    const state = url.searchParams.get('state') || 'active';
    const allowedStates = new Set(['active','inactive','sold_out','draft','expired']);
    if (!allowedStates.has(state)) return json({ error: 'Invalid listing state.' }, 400);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100);
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

    const { shop } = await resolveMyShop();
    const data = await etsyFetch(`/shops/${shop.shop_id}/listings?state=${encodeURIComponent(state)}&limit=${limit}&offset=${offset}&sort_on=updated&sort_order=down`);
    return json({ shop_id: shop.shop_id, shop_name: shop.shop_name, ...data });
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
