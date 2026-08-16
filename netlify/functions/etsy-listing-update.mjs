import { json, requireConnectorAuth, resolveMyShop, etsyFetch, safeError } from './_etsy.mjs';

function toForm(body) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || key === 'listing_id') continue;
    if (Array.isArray(value)) value.forEach(v => form.append(key, String(v)));
    else form.append(key, String(value));
  }
  return form;
}

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const body = await request.json();
    const listingId = Number(body.listing_id);
    if (!listingId) return json({ error: 'listing_id is required.' }, 400);
    const allowed = ['title','description','tags','state','price','quantity','should_auto_renew','is_personalizable','personalization_instructions','personalization_is_required','personalization_char_count_max','shop_section_id'];
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(patch).length) return json({ error: 'No supported update fields supplied.' }, 400);
    const { shop } = await resolveMyShop();
    const result = await etsyFetch(`/shops/${shop.shop_id}/listings/${listingId}`, { method: 'PATCH', body: toForm(patch), form: true });
    return json(result);
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
