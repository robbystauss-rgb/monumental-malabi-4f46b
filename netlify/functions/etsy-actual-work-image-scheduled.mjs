import { getStore } from '@netlify/blobs';
import { resolveMyShop, etsyFetch } from './_etsy.mjs';

const LISTING_ID = 4435836820;
const IMAGE_URL = 'https://drive.google.com/thumbnail?id=12gEjZLyIQubcX64TMvYoOoc24pQxG78t&sz=w2000';
const RESULT_KEY = 'actual-work-image-upload-v1';

function imageList(listing) {
  return Array.isArray(listing?.images) ? listing.images : Array.isArray(listing?.Images) ? listing.Images : [];
}

export default async () => {
  const store = getStore('rec-mama-etsy-auth', { consistency: 'strong' });
  const done = await store.get(RESULT_KEY, { type: 'json' });
  if (done?.verified === true) return;

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
};

export const config = { schedule: '* * * * *' };
