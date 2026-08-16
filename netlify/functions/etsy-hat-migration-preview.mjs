import { json, etsyFetch, resolveMyShop, safeError } from './_etsy.mjs';

const MATCH = /(custom|personalized).*(hat|cap)|(hat|cap).*(custom|personalized)|leather.*patch.*hat/i;

export default async (request) => {
  try {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce') || '';
    if (!process.env.HAT_MIGRATION_NONCE || nonce !== process.env.HAT_MIGRATION_NONCE) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const { shop } = await resolveMyShop();
    const shopId = shop.shop_id;
    const states = ['active','draft','inactive'];
    const candidates = [];
    for (const state of states) {
      const data = await etsyFetch(`/shops/${shopId}/listings/${state}?limit=100`);
      for (const listing of (data.results || [])) {
        if (!MATCH.test(listing.title || '')) continue;
        let inventory = null;
        try { inventory = await etsyFetch(`/listings/${listing.listing_id}/inventory`); } catch (e) { inventory = { error: e.message, details: e.payload }; }
        candidates.push({
          listing_id: listing.listing_id,
          title: listing.title,
          state: listing.state,
          quantity: listing.quantity,
          price: listing.price,
          url: listing.url,
          inventory
        });
      }
    }
    return json({ shop_id: shopId, candidate_count: candidates.length, candidates });
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
