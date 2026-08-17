import { etsyFetch, json, safeError } from './_etsy.mjs';

const LISTING_ID = 4435836820;
const STYLE_PROPERTY_ID = 513;
const COLOR_PROPERTY_ID = 514;

const catalog = {
  '112 Classic Trucker': {
    price: 30,
    colors: [
      'White','Black','Cardinal','Columbia Blue','Biscuit/True Blue','Quarry','Red','Royal','Dark Green','Loden','Orange','Navy','Purple','Amber Gold','Charcoal','Coffee','Cream','Kelly','Light Blue','Light Grey','Maroon','Smoke Blue',
      'Khaki/Coffee','Purple/White','Khaki/Legion Blue','Heather Grey/Dark Green','Charcoal/Black','Charcoal/Royal','Khaki/White','Khaki/Loden','Heather Grey/Light Grey','Charcoal/Columbia Blue','Charcoal/White','Loden/Black','Khaki/Navy','Heather Grey/Navy','Charcoal/Kelly','Chocolate Chip/Birch','Black/Charcoal','Black/Gold','Royal/Black','Maroon/White','White/Black','Heather Grey/Red','Columbia Blue/Black','Charcoal/Navy','Black/Vegas Gold','Royal/Red','White/Charcoal','Heather Grey/Royal','Columbia Blue/Khaki','Charcoal/Neon Blue','Black/White','Heather Grey/White','Navy/Khaki','Cyan/White','Black/Yellow','White/Kelly','Hot Pink/Black','Charcoal/Neon Orange','Navy/Orange','Brown/Khaki','White/Navy','Hot Pink/White','Charcoal/Neon Pink','Dark Green/Gold','Kelly/Black','White/Red','Caramel/Black','Charcoal/Neon Yellow','Navy/White','Dark Green/White','Kelly/White','Orange/Black','Khaki/Black','White/Royal','Cardinal/Black','Charcoal/Orange','Dark Green/Yellow','Khaki/Burgundy','Orange/White','Khaki/Chocolate Chip','Cardinal/White','Charcoal/Red','White/Columbia Blue','White/Dark Green',
      'Navy/White/Red','Grey/Charcoal/Black','Orange/White/Black','Grey/Charcoal/Navy','Red/White/Black','Heather Grey/Birch/Amber Gold','Heather Grey/Birch/Army Olive','Heather Grey/Cardinal/Navy','Red/White/Navy','Royal/White/Heather Grey','Black/White/Heather Grey','Royal/White/Red','Heather Grey/Charcoal/Dark Orange','Heather Grey/Charcoal/Maroon','Black/White/Red','Heather Grey/Dark Green/Black','Heather Grey/Red/Black','Blue Teal/Birch/Navy','White/Aluminum/Black','White/Aluminum/Navy','White/Columbia Blue/Yellow','Mink Beige/Charcoal/Amber Gold','Navy/White/Heather Grey','Columbia Blue/White/Navy','Dark Green/White/Heather Grey'
    ]
  },
  '112PFP Five-Panel': {
    price: 30,
    colors: [
      'Realtree Edge/Brown','Green Camo/Black','Digital Camo/Light Green','Green Camo/White','Desert Camo/Brown','Realtree Edge/Neon Orange','Admiral Duck Camo/Black','Realtree Edge/Neon Pink','Kryptek Highlander/Buck','Bark Duck Camo/Brown','Kryptek Inferno/Blaze Orange','Realtree Edge/Neon Yellow','Blaze Duck Camo/Blaze','Realtree Escape/Black','Kryptek Neptune/White','Kryptek Typhon/Black','Realtree Fishing Light Blue/White','Kryptek Typhon/Blaze Orange','Realtree Max-1 XT/Brown','Blizzard Duck Camo/White','Harvest Duck Camo/Light Tan','Realtree Max-7/Buck','Marsh Duck Camo/Loden','Sable Duck Camo/Black','Realtree Original/Black','Realtree Timber/Black','Saltwater Duck Camo/Charcoal','Mossy Oak Bottomland/Loden','Mossy Oak Country DNA/Black','Mossy Oak Elements Bonefish/Light Grey','Mossy Oak Habitat/Brown','Sienna Duck Camo/Loden','Kryptek Neptune/Black','Kryptek Inferno/Black','Kryptek Typhon/Neon Pink','Kryptek Typhon/Neon Yellow','Kryptek Typhon/Neon Orange','Mossy Oak Elements Blacktip/Charcoal','Realtree Fishing Light Blue/Navy'
    ]
  },
  '168 Seven-Panel': {
    price: 35,
    colors: ['Black','Loden','Navy','Black/Green Camo/Loden','Pale Khaki/Brown','Brown/Khaki','Caramel','Pale Khaki/Loden','Quarry','Charcoal','Red/Black','Charcoal/Black','Royal/Black','Charcoal/Black/White','White','Charcoal/Burnt Orange/Black','Charcoal/Old Gold','Dark Green/Black','Heather Grey/Black']
  },
  '256 Five-Panel': {
    price: 35,
    colors: ['Birch/Black','Midnight Navy/White','Navy/Red','Biscuit/Black','Navy/White','Black/Black','Black/White','Pale Peach/Maroon','Red/White','Cardinal/White','Sage/White','Charcoal/White','Sand Dune/Loden','Dark Mocha/Khaki','White/Black','Dark Orange/Black','Dusty Blue/White','Dusty Red/White','Loden/Gold']
  }
};

function summarize(inventory) {
  const styles = {};
  for (const product of inventory?.products || []) {
    const props = product.property_values || [];
    const style = props.find((p) => p.property_name === 'Hat Style')?.values?.[0] || props.find((p) => p.property_id === STYLE_PROPERTY_ID)?.values?.[0];
    const color = props.find((p) => p.property_name === 'Hat Color')?.values?.[0] || props.find((p) => p.property_id === COLOR_PROPERTY_ID)?.values?.[0];
    if (!style || !color) continue;
    styles[style] ||= { count: 0, colors: [], prices: new Set() };
    styles[style].count += 1;
    styles[style].colors.push(color);
    const offering = (product.offerings || []).find((o) => !o.is_deleted);
    if (offering?.price) {
      const p = offering.price;
      const value = typeof p === 'number' ? p : Number(p.amount || 0) / Number(p.divisor || 100);
      styles[style].prices.add(value);
    }
  }
  return Object.fromEntries(Object.entries(styles).map(([k,v]) => [k, { count: v.count, prices: [...v.prices], first_colors: v.colors.slice(0, 8) }]));
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce') || '';
    const expected = Netlify.env.get('HAT_MIGRATION_NONCE') || '';
    if (!expected || nonce !== expected) return json({ error: 'Unauthorized' }, 401);

    const listing = await etsyFetch(`/listings/${LISTING_ID}`);
    if (!/hat|cap/i.test(listing?.title || '')) return json({ error: 'Safety stop: target is not a hat listing.', title: listing?.title }, 409);

    const before = await etsyFetch(`/listings/${LISTING_ID}/inventory`);
    let quantity = 100;
    let readinessStateId;
    outer: for (const product of before?.products || []) {
      for (const offering of product.offerings || []) {
        if (offering.is_deleted) continue;
        quantity = Number(offering.quantity ?? quantity);
        if (offering.readiness_state_id) readinessStateId = offering.readiness_state_id;
        break outer;
      }
    }

    const products = [];
    for (const [style, data] of Object.entries(catalog)) {
      for (const color of data.colors) {
        const offering = { quantity, is_enabled: true, price: data.price };
        if (readinessStateId) offering.readiness_state_id = readinessStateId;
        products.push({
          sku: '',
          offerings: [offering],
          property_values: [
            { property_id: STYLE_PROPERTY_ID, property_name: 'Hat Style', value_ids: [], values: [style] },
            { property_id: COLOR_PROPERTY_ID, property_name: 'Hat Color', value_ids: [], values: [color] }
          ]
        });
      }
    }

    const payload = {
      products,
      price_on_property: [STYLE_PROPERTY_ID],
      quantity_on_property: [],
      sku_on_property: [],
      readiness_state_on_property: []
    };

    await etsyFetch(`/listings/${LISTING_ID}/inventory?max_variations_supported=2`, { method: 'PUT', body: payload });
    const after = await etsyFetch(`/listings/${LISTING_ID}/inventory`);

    return json({
      applied: true,
      listing_id: LISTING_ID,
      title: listing.title,
      before_product_count: (before.products || []).length,
      after_product_count: (after.products || []).length,
      expected_product_count: products.length,
      style_summary: summarize(after),
      price_on_property: after.price_on_property || [],
      quantity_preserved_from_existing_offering: quantity
    });
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
