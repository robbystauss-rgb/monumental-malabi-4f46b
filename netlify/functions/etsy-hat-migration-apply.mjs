import { json, etsyFetch, safeError } from './_etsy.mjs';

const EXPECTED_TITLE = /(custom|personalized).*(hat|cap)|(hat|cap).*(custom|personalized)|leather.*patch.*hat/i;

function moneyToDecimal(m) {
  if (typeof m === 'number') return m;
  if (m && Number(m.divisor)) return Number(m.amount || 0) / Number(m.divisor);
  return Number(m?.amount || 0);
}

function cleanOffering(offering) {
  const out = {
    quantity: Number(offering?.quantity || 0),
    is_enabled: offering?.is_enabled !== false,
    price: moneyToDecimal(offering?.price)
  };
  if (offering?.readiness_state_id) out.readiness_state_id = offering.readiness_state_id;
  return out;
}

function sourceOffering(inventory) {
  for (const product of inventory?.products || []) {
    for (const offering of product?.offerings || []) {
      if (!offering?.is_deleted) return cleanOffering(offering);
    }
  }
  return null;
}

const catalog = {
  'Richardson 112': ['Royal','Black','Red','Quarry','Khaki/Coffee','Blue Teal/Birch/Navy','White/Red','White/Royal'],
  'Richardson 168': ['Black','Loden','Navy','Black/Green Camo/Loden','Pale Khaki/Brown','Brown/Khaki','Caramel','Pale Khaki/Loden','Quarry','Charcoal','Red/Black','Charcoal/Black','Royal/Black','Charcoal/Black/White','White','Charcoal/Burnt Orange/Black','Charcoal/Old Gold','Dark Green/Black','Heather Grey/Black'],
  'Richardson 256': ['Birch/Black','Midnight Navy/White','Navy/Red','Biscuit/Black','Navy/White','Black/Black','Black/White','Pale Peach/Maroon','Red/White','Cardinal/White','Sage/White','Charcoal/White','Sand Dune/Loden','Dark Mocha/Khaki','White/Black','Dark Orange/Black','Dusty Blue/White','Dusty Red/White','Loden/Gold'],
  'Richardson 112PFP': ['Realtree Edge/Brown','Green Camo/Black','Digital Camo/Light Green','Green Camo/White','Desert Camo/Brown','Realtree Edge/Neon Orange','Admiral Duck Camo/Black','Realtree Edge/Neon Pink','Kryptek Highlander/Buck','Bark Duck Camo/Brown','Kryptek Inferno/Blaze Orange','Realtree Edge/Neon Yellow','Blaze Duck Camo/Blaze','Realtree Escape/Black','Kryptek Neptune/White','Kryptek Typhon/Black','Realtree Fishing Light Blue/White','Kryptek Typhon/Blaze Orange','Realtree Max-1 XT/Brown','Blizzard Duck Camo/White','Harvest Duck Camo/Light Tan','Realtree Max-7/Buck','Marsh Duck Camo/Loden','Sable Duck Camo/Black','Realtree Original/Black','Realtree Timber/Black','Saltwater Duck Camo/Charcoal','Mossy Oak Bottomland/Loden','Mossy Oak Country DNA/Black','Mossy Oak Elements Bonefish/Light Grey','Mossy Oak Habitat/Brown','Sienna Duck Camo/Loden']
};

export default async (request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
    const nonce = request.headers.get('x-hat-migration-nonce') || '';
    if (!process.env.HAT_MIGRATION_NONCE || nonce !== process.env.HAT_MIGRATION_NONCE) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const listingId = Number(body.listing_id);
    if (!listingId) return json({ error: 'listing_id is required' }, 400);

    const listing = await etsyFetch(`/listings/${listingId}`);
    if (!EXPECTED_TITLE.test(listing.title || '')) return json({ error: 'Safety stop: listing title does not look like a custom hat listing.', listing_id: listingId, title: listing.title }, 409);

    const inventory = await etsyFetch(`/listings/${listingId}/inventory`);
    const offering = sourceOffering(inventory);
    if (!offering) return json({ error: 'Safety stop: no current offering found to preserve price/quantity.' }, 409);

    // Etsy custom variation IDs: 513 and 514 are the first two custom variations.
    const stylePropertyId = 513;
    const colorPropertyId = 514;
    const products = [];
    for (const [model, colors] of Object.entries(catalog)) {
      for (const color of colors) {
        products.push({
          sku: '',
          offerings: [{ ...offering }],
          property_values: [
            { property_id: stylePropertyId, property_name: 'Hat Style', scale_id: null, value_ids: [], values: [model] },
            { property_id: colorPropertyId, property_name: 'Hat Color', scale_id: null, value_ids: [], values: [color] }
          ]
        });
      }
    }

    if (products.length > 400) return json({ error: 'Safety stop: product count exceeds conservative migration limit.', count: products.length }, 409);

    const payload = { products, price_on_property: [], quantity_on_property: [], sku_on_property: [], readiness_state_on_property: [] };

    if (body.dry_run !== false) {
      return json({
        dry_run: true,
        listing_id: listingId,
        title: listing.title,
        preserved_offering: offering,
        product_count: products.length,
        models: Object.fromEntries(Object.entries(catalog).map(([k,v]) => [k, v.length])),
        current_variation_property_names: [...new Set((inventory.products || []).flatMap(p => (p.property_values || []).map(v => v.property_name)))],
        current_product_count: (inventory.products || []).length,
        note: 'No Etsy write performed.'
      });
    }

    if (body.confirm_phrase !== 'APPLY VERIFIED HAT VARIATIONS') return json({ error: 'Safety stop: exact confirm_phrase required.' }, 409);

    const result = await etsyFetch(`/listings/${listingId}/inventory?max_variations_supported=2`, { method: 'PUT', body: payload });
    return json({ applied: true, listing_id: listingId, product_count: products.length, result });
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
