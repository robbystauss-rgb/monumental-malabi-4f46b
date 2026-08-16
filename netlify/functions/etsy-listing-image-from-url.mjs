import { json, requireConnectorAuth, resolveMyShop, etsyFetch, safeError } from './_etsy.mjs';

function isSafePublicHttps(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (host.endsWith('.local')) return false;
    return true;
  } catch { return false; }
}

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const body = await request.json();
    const listingId = Number(body.listing_id);
    const imageUrl = String(body.image_url || '');
    if (!listingId || !isSafePublicHttps(imageUrl)) return json({ error: 'A valid listing_id and public HTTPS image_url are required.' }, 400);

    const imageResponse = await fetch(imageUrl, { redirect: 'follow' });
    if (!imageResponse.ok) return json({ error: `Could not fetch image: ${imageResponse.status}` }, 400);
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) return json({ error: 'URL did not return an image.' }, 400);
    const bytes = await imageResponse.arrayBuffer();
    if (bytes.byteLength > 20 * 1024 * 1024) return json({ error: 'Image is larger than 20 MB.' }, 400);

    const form = new FormData();
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    form.append('image', new Blob([bytes], { type: contentType }), `listing.${ext}`);
    form.append('rank', String(Number(body.rank || 1)));
    form.append('overwrite', body.overwrite ? 'true' : 'false');
    if (body.alt_text) form.append('alt_text', String(body.alt_text).slice(0, 500));

    const { shop } = await resolveMyShop();
    const result = await etsyFetch(`/shops/${shop.shop_id}/listings/${listingId}/images`, { method: 'POST', body: form });
    return json(result, 201);
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
