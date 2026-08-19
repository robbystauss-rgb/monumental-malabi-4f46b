import { getStore } from '@netlify/blobs';
import { resolveMyShop, etsyFetch } from './_etsy.mjs';

const LISTING_ID = 4435836820;
const IMAGE_URL = 'https://drive.google.com/thumbnail?id=12gEjZLyIQubcX64TMvYoOoc24pQxG78t&sz=w2000';
const RESULT_KEY = 'actual-work-image-upload-v1';
const REPORTED_KEY = 'actual-work-image-form-reported-v1';

function imageList(listing) {
  return Array.isArray(listing?.images) ? listing.images : Array.isArray(listing?.Images) ? listing.Images : [];
}

async function reportVerifiedResult(store, result) {
  const reported = await store.get(REPORTED_KEY, { type: 'json' });
  if (reported?.reported === true || result?.verified !== true) return;
  const body = new URLSearchParams({
    'form-name': 'etsy-actual-work-verification',
    verified: 'true',
    listing_id: String(result.listing_id || ''),
    image_id: String(result.image_id || ''),
    rank: String(result.rank || ''),
    before_image_count: String(result.before_image_count ?? ''),
    after_image_count: String(result.after_image_count ?? ''),
    completed_at: String(result.completed_at || '')
  });
  const response = await fetch('https://recmamamade.netlify.app/etsy-upload-status-bridge.html', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error(`Could not submit verification bridge: ${response.status}`);
  await store.setJSON(REPORTED_KEY, { reported: true, at: new Date().toISOString() });
}

export default async () => {
  const store = getStore('rec-mama-etsy-auth', { consistency: 'strong' });
  const done = await store.get(RESULT_KEY, { type: 'json' });
  if (done?.verified === true) {
    await reportVerifiedResult(store, done);
    return;
  }

  const before = await etsyFetch(`/listings/${LISTING_ID}?includes=Images`);
  const beforeImages = imageList(before);

  const source = await fetch(IMAGE_URL, { redirect: 'follow' });
  if (!source.ok) throw new Error(`Could not fetch approved actual-work image: ${source.status}`);
  const contentType = source.headers.get('content-type') || 'image/jpeg';
  if (!contentType.startsWith('image/')) throw new Error('Approved image URL did not return an image.');
  const bytes = await source.arrayBuffer();
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('Approved image is larger than 20 MB.');

  const form = new FormData();
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  form.append('image', new Blob([bytes], { type: contentType }), `actual-finished-work.${ext}`);
  form.append('rank', '2');
  form.append('overwrite', 'false');
  form.append('alt_text', 'Actual finished REC Mama Made custom leather patch hats showing multiple hat styles, colors, and engraved leatherette logo patches.');

  const { shop } = await resolveMyShop();
  const upload = await etsyFetch(`/shops/${shop.shop_id}/listings/${LISTING_ID}/images`, { method: 'POST', body: form });
  const after = await etsyFetch(`/listings/${LISTING_ID}?includes=Images`);
  const afterImages = imageList(after);
  const imageId = Number(upload?.listing_image_id || upload?.image_id || 0) || null;
  const verifiedById = imageId ? afterImages.some(img => Number(img?.listing_image_id || img?.image_id) === imageId) : false;
  const verifiedByCount = afterImages.length > beforeImages.length;
  const verified = verifiedById || verifiedByCount;

  const result = {
    verified,
    listing_id: LISTING_ID,
    image_id: imageId,
    rank: Number(upload?.rank || 2),
    before_image_count: beforeImages.length,
    after_image_count: afterImages.length,
    source: 'REC Mama Made - Actual Finished Hat Assortment.jpg',
    completed_at: new Date().toISOString()
  };
  await store.setJSON(RESULT_KEY, result);
  if (!verified) throw new Error(`Etsy upload returned but verification failed: ${JSON.stringify(result)}`);
  await reportVerifiedResult(store, result);
};

export const config = { schedule: '* * * * *' };
