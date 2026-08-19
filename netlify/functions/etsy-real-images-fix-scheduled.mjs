import { getStore } from '@netlify/blobs';
import { resolveMyShop, etsyFetch } from './_etsy.mjs';

const SHOP_ID = 63877934;
const STORE_NAME = 'rec-mama-etsy-auth';
const STATE_KEY = 'real-images-all-active-listings-v2';
const REPORTED_KEY = 'real-images-all-active-listings-v2-reported';

const PLAN = [
  {
    op: 'hat-main-cbd-pair',
    listing_id: 4435836820,
    rank: 1,
    image_url: 'https://drive.google.com/thumbnail?id=18y7TZphRzAyauJHGuMMsu9s_HSb4QNL7&sz=w2000',
    alt_text: 'Actual REC Mama Made finished custom leather patch hats, photographed after production. CBD Energy logo hats shown as real completed work.'
  },
  {
    op: 'hat-main-nopsi-trio',
    listing_id: 4435836820,
    rank: 2,
    image_url: 'https://drive.google.com/thumbnail?id=1Q1eHmqv6IUs4ngqQOZad2k109lyK3xl3&sz=w2000',
    alt_text: 'Actual REC Mama Made finished leather patch hats including NOPSI, Cable Splicer and CBD Energy custom hats.'
  },
  {
    op: 'hat-168-real-assortment',
    listing_id: 4483291224,
    rank: 1,
    image_url: 'https://drive.google.com/thumbnail?id=12gEjZLyIQubcX64TMvYoOoc24pQxG78t&sz=w2000',
    alt_text: 'Actual finished REC Mama Made leather patch hat assortment showing real completed custom work. Richardson 168 style options are shown in the remaining listing images.'
  },
  {
    op: 'hat-168-real-trio',
    listing_id: 4483291224,
    rank: 2,
    image_url: 'https://drive.google.com/thumbnail?id=1Q1eHmqv6IUs4ngqQOZad2k109lyK3xl3&sz=w2000',
    alt_text: 'Actual REC Mama Made finished custom leather patch hats photographed after production; shown as examples of engraving and patch workmanship.'
  },
  {
    op: 'patch-real-loose',
    listing_id: 4483317920,
    rank: 1,
    image_url: 'https://drive.google.com/thumbnail?id=1D7sBNDgb5v3w1ELiJNpO4wcRrutQw1ws&sz=w2000',
    alt_text: 'Actual REC Mama Made laser engraved leatherette patches photographed after production, showing real engraving detail and finished patch examples.'
  },
  {
    op: 'patch-real-measured',
    listing_id: 4483317920,
    rank: 2,
    image_url: 'https://drive.google.com/thumbnail?id=1JniEwHiJel8r2_lW73LIclWDsIF-frRV&sz=w2000',
    alt_text: 'Actual REC Mama Made engraved leatherette logo patch photographed against rulers to show the physical patch size and finished engraving quality.'
  }
];

function imagesOf(listing) {
  return Array.isArray(listing?.images) ? listing.images : Array.isArray(listing?.Images) ? listing.Images : [];
}

async function uploadImage(shopId, item) {
  const before = await etsyFetch(`/listings/${item.listing_id}?includes=Images`);
  const beforeImages = imagesOf(before);
  if (beforeImages.length >= 10) {
    throw new Error(`Listing ${item.listing_id} is already at Etsy's 10-image limit before operation ${item.op}.`);
  }

  const source = await fetch(item.image_url, { redirect: 'follow' });
  if (!source.ok) throw new Error(`Could not fetch ${item.op} source image: ${source.status}`);
  const contentType = source.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error(`${item.op} source did not return an image.`);
  const bytes = await source.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 20 * 1024 * 1024) throw new Error(`${item.op} source image size is invalid.`);

  const form = new FormData();
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  form.append('image', new Blob([bytes], { type: contentType }), `${item.op}.${ext}`);
  form.append('rank', String(item.rank));
  form.append('overwrite', 'false');
  form.append('alt_text', item.alt_text.slice(0, 500));

  const upload = await etsyFetch(`/shops/${shopId}/listings/${item.listing_id}/images`, { method: 'POST', body: form });
  const imageId = Number(upload?.listing_image_id || upload?.image_id || 0) || null;
  const after = await etsyFetch(`/listings/${item.listing_id}?includes=Images`);
  const afterImages = imagesOf(after);
  const present = imageId ? afterImages.some((img) => Number(img?.listing_image_id || img?.image_id) === imageId) : afterImages.length > beforeImages.length;
  if (!present) throw new Error(`Etsy did not verify image ${imageId || '(unknown)'} for ${item.op}.`);

  const saved = imageId ? afterImages.find((img) => Number(img?.listing_image_id || img?.image_id) === imageId) : null;
  return {
    op: item.op,
    listing_id: item.listing_id,
    image_id: imageId,
    requested_rank: item.rank,
    actual_rank: Number(saved?.rank || 0) || null,
    before_image_count: beforeImages.length,
    after_image_count: afterImages.length,
    verified: true,
    completed_at: new Date().toISOString()
  };
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
  if (!response.ok) throw new Error(`Could not submit real-image fix verification: ${response.status}`);
}

export default async () => {
  const store = getStore(STORE_NAME, { consistency: 'strong' });
  const alreadyReported = await store.get(REPORTED_KEY, { type: 'json' });
  if (alreadyReported?.reported === true) return;

  const { shop } = await resolveMyShop();
  if (Number(shop?.shop_id) !== SHOP_ID) throw new Error(`Connected Etsy shop mismatch: expected ${SHOP_ID}, received ${shop?.shop_id}.`);

  const state = (await store.get(STATE_KEY, { type: 'json' })) || { operations: {} };

  for (const item of PLAN) {
    if (state.operations?.[item.op]?.verified === true) continue;
    const result = await uploadImage(SHOP_ID, item);
    state.operations[item.op] = result;
    state.updated_at = new Date().toISOString();
    await store.setJSON(STATE_KEY, state);
  }

  const listingIds = [...new Set(PLAN.map((p) => p.listing_id))];
  const listings = [];
  for (const listingId of listingIds) {
    const current = await etsyFetch(`/listings/${listingId}?includes=Images`);
    const images = imagesOf(current);
    listings.push({
      listing_id: listingId,
      title: current?.title,
      state: current?.state,
      image_count: images.length,
      images: images.map((img) => ({
        image_id: Number(img?.listing_image_id || img?.image_id || 0) || null,
        rank: Number(img?.rank || 0) || null,
        alt_text: img?.alt_text || null
      }))
    });
  }

  const operationResults = PLAN.map((p) => state.operations?.[p.op]).filter(Boolean);
  const allVerified = PLAN.every((p) => state.operations?.[p.op]?.verified === true);
  const idsPresent = operationResults.every((op) => {
    const listing = listings.find((l) => l.listing_id === op.listing_id);
    return listing?.images?.some((img) => img.image_id === op.image_id);
  });

  const payload = {
    verified: allVerified && idsPresent,
    shop_id: SHOP_ID,
    active_listings_fixed: listingIds.length,
    operations: operationResults,
    listings,
    completed_at: new Date().toISOString()
  };

  await store.setJSON(STATE_KEY, { ...state, final: payload });
  await report(payload);
  await store.setJSON(REPORTED_KEY, { reported: true, at: new Date().toISOString() });
};

export const config = { schedule: '* * * * *' };
