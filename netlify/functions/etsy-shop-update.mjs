import { json, requireConnectorAuth, resolveMyShop, etsyFetch, safeError } from './_etsy.mjs';

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const body = await request.json();
    const form = new URLSearchParams();
    for (const key of ['title','announcement','sale_message','digital_sale_message']) {
      if (body[key] !== undefined && body[key] !== null) form.append(key, String(body[key]));
    }
    if ([...form.keys()].length === 0) return json({ error: 'No supported shop fields supplied.' }, 400);
    const { shop } = await resolveMyShop();
    const result = await etsyFetch(`/shops/${shop.shop_id}`, { method: 'PUT', body: form, form: true });
    return json(result);
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
