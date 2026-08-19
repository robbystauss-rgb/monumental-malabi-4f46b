import { getStore } from '@netlify/blobs';
import { resolveMyShop, etsyFetch } from './_etsy.mjs';

const STORE = 'rec-mama-etsy-auth';
const RESULT_KEY = 'full-shop-real-image-audit-v1';
const REPORTED_KEY = 'full-shop-real-image-audit-reported-v1';

async function loadActiveListings(shopId) {
  const all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const page = await etsyFetch(`/shops/${shopId}/listings?state=active&limit=${limit}&offset=${offset}&sort_on=updated&sort_order=down&includes=Images`);
    const rows = Array.isArray(page?.results) ? page.results : [];
    all.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
    if (offset > 1000) break;
  }
  return all;
}

async function submitBridge(payload) {
  const body = new URLSearchParams({
    'form-name': 'etsy-listing-audit',
    payload: JSON.stringify(payload),
  });
  const response = await fetch('https://recmamamade.netlify.app/etsy-listing-audit-bridge.html', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Could not submit audit bridge: ${response.status}`);
}

export default async () => {
  const store = getStore(STORE, { consistency: 'strong' });
  const reported = await store.get(REPORTED_KEY, { type: 'json' });
  if (reported?.reported === true) return;

  let result = await store.get(RESULT_KEY, { type: 'json' });
  if (!result) {
    const { shop } = await resolveMyShop();
    const listings = await loadActiveListings(shop.shop_id);
    result = {
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      active_count: listings.length,
      listings: listings.map((l) => ({
        listing_id: l.listing_id,
        title: l.title,
        state: l.state,
        image_count: Array.isArray(l.images) ? l.images.length : Array.isArray(l.Images) ? l.Images.length : 0,
        image_ids: (Array.isArray(l.images) ? l.images : Array.isArray(l.Images) ? l.Images : []).map((i) => i.listing_image_id || i.image_id).filter(Boolean),
      })),
      audited_at: new Date().toISOString(),
    };
    await store.setJSON(RESULT_KEY, result);
  }

  await submitBridge(result);
  await store.setJSON(REPORTED_KEY, { reported: true, at: new Date().toISOString() });
};

export const config = { schedule: '* * * * *' };
