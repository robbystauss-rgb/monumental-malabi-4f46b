import { getStore } from '@netlify/blobs';
import { etsyFetch, resolveMyShop } from './_etsy.mjs';

const SHOP_ID = 63877934;
const STORE_NAME = 'rec-mama-etsy-auth';
const STATE_KEY = 'real-primary-images-v1';
const REPORTED_KEY = 'real-primary-images-v1-reported';

const TARGETS = [
  { listing_id: 4435836820, old_primary_id: 8430677449, real_primary_id: 8453235031 },
  { listing_id: 4483291224, old_primary_id: 7616817105, real_primary_id: 8405351184 },
  { listing_id: 4483317920, old_primary_id: 8430738417, real_primary_id: 8453235257 }
];

function imagesOf(listing) {
  return Array.isArray(listing?.images) ? listing.images : Array.isArray(listing?.Images) ? listing.Images : [];
}

async function report(payload) {
  const body = new URLSearchParams({
    'form-name': 'etsy-listing-real-image-fix',
    payload: JSON.stringify(payload)
  });
  const response = await fetch('https://recmamamade.netlify.app/etsy-listing-fix-bridge.html', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error(`Could not submit primary-image verification: ${response.status}`);
}

export default async () => {
  const store = getStore(STORE_NAME, { consistency: 'strong' });
  const reported = await store.get(REPORTED_KEY, { type: 'json' });
  if (reported?.reported === true) return;

  const { shop } = await resolveMyShop();
  if (Number(shop?.shop_id) !== SHOP_ID) throw new Error(`Connected shop mismatch: ${shop?.shop_id}`);

  const state = (await store.get(STATE_KEY, { type: 'json' })) || { results: {} };

  for (const target of TARGETS) {
    if (state.results?.[target.listing_id]?.verified === true) continue;

    const before = await etsyFetch(`/listings/${target.listing_id}?includes=Images`);
    const beforeImages = imagesOf(before);
    const realExistsBefore = beforeImages.some((img) => Number(img?.listing_image_id || img?.image_id) === target.real_primary_id);
    if (!realExistsBefore) throw new Error(`Real primary ${target.real_primary_id} missing from listing ${target.listing_id}.`);

    const oldExists = beforeImages.some((img) => Number(img?.listing_image_id || img?.image_id) === target.old_primary_id);
    if (oldExists) {
      await etsyFetch(`/shops/${SHOP_ID}/listings/${target.listing_id}/images/${target.old_primary_id}`, { method: 'DELETE' });
    }

    const after = await etsyFetch(`/listings/${target.listing_id}?includes=Images`);
    const afterImages = imagesOf(after);
    const real = afterImages.find((img) => Number(img?.listing_image_id || img?.image_id) === target.real_primary_id);
    const oldStillExists = afterImages.some((img) => Number(img?.listing_image_id || img?.image_id) === target.old_primary_id);
    const rankOneIds = afterImages.filter((img) => Number(img?.rank) === 1).map((img) => Number(img?.listing_image_id || img?.image_id));
    const verified = Boolean(real) && !oldStillExists && Number(real?.rank) === 1 && rankOneIds.includes(target.real_primary_id);

    const result = {
      listing_id: target.listing_id,
      removed_old_primary_id: target.old_primary_id,
      real_primary_id: target.real_primary_id,
      real_primary_rank: Number(real?.rank || 0) || null,
      rank_one_ids: rankOneIds,
      before_image_count: beforeImages.length,
      after_image_count: afterImages.length,
      verified,
      checked_at: new Date().toISOString()
    };
    state.results[target.listing_id] = result;
    await store.setJSON(STATE_KEY, state);
    if (!verified) throw new Error(`Primary verification failed: ${JSON.stringify(result)}`);
  }

  const payload = {
    phase: 'real-primary-cleanup',
    verified: TARGETS.every((t) => state.results?.[t.listing_id]?.verified === true),
    shop_id: SHOP_ID,
    results: TARGETS.map((t) => state.results[t.listing_id]),
    completed_at: new Date().toISOString()
  };
  await report(payload);
  await store.setJSON(REPORTED_KEY, { reported: true, at: new Date().toISOString() });
};

export const config = { schedule: '* * * * *' };
