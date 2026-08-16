import { json, requireConnectorAuth, etsyFetch, safeError } from './_etsy.mjs';

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const body = await request.json();
    const listingId = Number(body.listing_id);
    if (!listingId) return json({ error: 'listing_id is required.' }, 400);
    if (!Array.isArray(body.products) || body.products.length === 0) {
      return json({ error: 'products must be a non-empty array.' }, 400);
    }
    const payload = {
      products: body.products,
      price_on_property: Array.isArray(body.price_on_property) ? body.price_on_property : [],
      quantity_on_property: Array.isArray(body.quantity_on_property) ? body.quantity_on_property : [],
      sku_on_property: Array.isArray(body.sku_on_property) ? body.sku_on_property : [],
      readiness_state_on_property: Array.isArray(body.readiness_state_on_property) ? body.readiness_state_on_property : []
    };
    const maxVariations = body.max_variations_supported === 3 ? 3 : 2;
    const result = await etsyFetch(`/listings/${listingId}/inventory?max_variations_supported=${maxVariations}`, {
      method: 'PUT',
      body: payload
    });
    return json(result);
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
