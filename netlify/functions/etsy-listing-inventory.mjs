import { json, requireConnectorAuth, etsyFetch, safeError } from './_etsy.mjs';

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  try {
    const url = new URL(request.url);
    const listingId = Number(url.searchParams.get('listing_id'));
    if (!listingId) return json({ error: 'listing_id is required.' }, 400);
    const result = await etsyFetch(`/listings/${listingId}/inventory`);
    return json(result);
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
