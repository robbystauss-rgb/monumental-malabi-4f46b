import { getStore } from '@netlify/blobs';

export default async () => {
  const store = getStore('rec-mama-etsy-auth', { consistency: 'strong' });
  const result = await store.get('actual-work-image-upload-v1', { type: 'json' });
  const safe = result ? {
    verified: Boolean(result.verified),
    listing_id: result.listing_id,
    image_id: result.image_id,
    rank: result.rank,
    before_image_count: result.before_image_count,
    after_image_count: result.after_image_count,
    source: result.source,
    completed_at: result.completed_at
  } : { verified: false, pending: true };
  return new Response(JSON.stringify(safe, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
