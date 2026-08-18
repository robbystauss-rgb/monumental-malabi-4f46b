import { getStore } from '@netlify/blobs';

export default async () => {
  const store = getStore('rec-mama-etsy-auth');
  const result = await store.get('hat-expand-188-result', { type: 'json' });
  const attempt = await store.get('hat-expand-188-last-attempt', { type: 'json' });
  const safe = {
    completed: Boolean(result?.applied),
    result: result ? {
      applied: result.applied,
      listing_id: result.listing_id,
      title: result.title,
      before_product_count: result.before_product_count,
      after_product_count: result.after_product_count,
      expected_product_count: result.expected_product_count,
      update_result_product_count: result.update_result_product_count,
      quantity_preserved: result.quantity_preserved,
      price_on_property: result.price_on_property,
      summary: result.summary,
      completed_at: result.completed_at
    } : null,
    last_attempt: attempt ? { status: attempt.status, payload: attempt.payload, at: attempt.at } : null
  };
  return new Response(JSON.stringify(safe, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
