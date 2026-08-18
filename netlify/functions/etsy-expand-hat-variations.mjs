import { etsyFetch, json, safeError } from './_etsy.mjs';
import { catalog } from './hat-options.mjs';

const LISTING_ID = 4435836820;
const STYLE = 513;
const COLOR = 514;
const styleMap = {
  'Richardson 112': { label: '112 Classic Trucker', price: 30 },
  'Richardson 112PFP': { label: '112PFP Five-Panel', price: 30 },
  'Richardson 168': { label: '168 Seven-Panel', price: 35 },
  'Richardson 256': { label: '256 Five-Panel', price: 35 },
};

function priceValue(p) {
  if (typeof p === 'number') return p;
  if (p && Number(p.divisor)) return Number(p.amount || 0) / Number(p.divisor);
  return null;
}

function summarize(inv) {
  const s = {};
  for (const p of inv?.products || []) {
    const props = p.property_values || [];
    const style = props.find(x => x.property_id === STYLE)?.values?.[0];
    const color = props.find(x => x.property_id === COLOR)?.values?.[0];
    if (!style || !color) continue;
    s[style] ||= { count: 0, prices: new Set(), colors: [] };
    s[style].count++;
    s[style].colors.push(color);
    const off = (p.offerings || []).find(o => !o.is_deleted);
    const v = priceValue(off?.price);
    if (v != null) s[style].prices.add(v);
  }
  return Object.fromEntries(Object.entries(s).map(([k,v]) => [k, { count: v.count, prices: [...v.prices], sample_colors: v.colors.slice(0, 8) }]));
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const nonce = url.searchParams.get('nonce') || '';
    const expected = Netlify.env.get('HAT_EXPAND_NONCE') || '';
    if (!expected || nonce !== expected) return json({ error: 'Unauthorized' }, 401);

    const listing = await etsyFetch(`/listings/${LISTING_ID}`);
    if (!/hat|cap/i.test(listing?.title || '')) return json({ error: 'Safety stop: target is not a hat listing.' }, 409);

    const before = await etsyFetch(`/listings/${LISTING_ID}/inventory`);
    let quantity = 100;
    let readiness_state_id;
    outer: for (const p of before?.products || []) {
      for (const o of p.offerings || []) {
        if (o.is_deleted) continue;
        quantity = Number(o.quantity ?? quantity);
        readiness_state_id = o.readiness_state_id || readiness_state_id;
        break outer;
      }
    }

    const products = [];
    for (const model of catalog.etsy_strategy.primary_styles) {
      const md = catalog.models[model];
      const m = styleMap[model];
      if (!md || !m) continue;
      for (const color of md.options || []) {
        const offering = { quantity, is_enabled: true, price: m.price };
        if (readiness_state_id) offering.readiness_state_id = readiness_state_id;
        products.push({
          sku: '',
          offerings: [offering],
          property_values: [
            { property_id: STYLE, property_name: 'Hat Style', scale_id: null, value_ids: [], values: [m.label] },
            { property_id: COLOR, property_name: 'Hat Color', scale_id: null, value_ids: [], values: [color] }
          ]
        });
      }
    }

    if (products.length !== 188) return json({ error: 'Safety stop: unexpected product count', count: products.length }, 409);

    const payload = { products, price_on_property: [STYLE], quantity_on_property: [], sku_on_property: [], readiness_state_on_property: [] };
    const result = await etsyFetch(`/listings/${LISTING_ID}/inventory?max_variations_supported=2`, { method: 'PUT', body: payload });
    const after = await etsyFetch(`/listings/${LISTING_ID}/inventory`);

    return json({
      applied: true,
      listing_id: LISTING_ID,
      title: listing.title,
      before_product_count: (before.products || []).length,
      after_product_count: (after.products || []).length,
      expected_product_count: products.length,
      update_result_product_count: (result.products || []).length,
      quantity_preserved: quantity,
      price_on_property: after.price_on_property || [],
      summary: summarize(after)
    });
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
