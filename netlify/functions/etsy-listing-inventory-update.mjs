import { json, requireConnectorAuth, etsyFetch, safeError, tokenStore } from './_etsy.mjs';

function moneyValue(value) {
  if (typeof value === 'number') return value;
  if (value && Number(value.divisor)) return Number(value.amount || 0) / Number(value.divisor);
  return Number(value?.amount || 0);
}

function productSignature(product) {
  const props = (product?.property_values || [])
    .map((p) => `${Number(p.property_id)}:${(p.values || []).join('|')}`)
    .sort()
    .join('~');
  const offering = (product?.offerings || []).find((o) => !o.is_deleted) || product?.offerings?.[0] || {};
  return `${props}::${moneyValue(offering.price)}::${Number(offering.quantity || 0)}::${offering.is_enabled !== false}`;
}

function inventorySummary(inventory) {
  const products = inventory?.products || [];
  const propertyNames = [...new Set(products.flatMap((p) => (p.property_values || []).map((v) => v.property_name).filter(Boolean)))];
  const prices = [...new Set(products.flatMap((p) => (p.offerings || []).filter((o) => !o.is_deleted).map((o) => moneyValue(o.price))))].sort((a,b)=>a-b);
  return { product_count: products.length, property_names: propertyNames, prices };
}

async function saveBackup(listingId, inventory) {
  const store = tokenStore();
  const createdAt = new Date().toISOString();
  const key = `inventory-backup-${listingId}-${Date.now()}`;
  await store.setJSON(key, { listing_id: listingId, created_at: createdAt, inventory });

  const indexKey = `inventory-backup-index-${listingId}`;
  const current = await store.get(indexKey, { type: 'json' });
  const entries = [{ key, created_at: createdAt, summary: inventorySummary(inventory) }, ...(Array.isArray(current) ? current : [])];
  const keep = entries.slice(0, 10);
  await store.setJSON(indexKey, keep);
  for (const old of entries.slice(10)) {
    if (old?.key) await store.delete(old.key);
  }
  return { key, created_at: createdAt };
}

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
  try {
    const body = await request.json();
    const listingId = Number(body.listing_id);
    if (!listingId) return json({ error: 'listing_id is required.' }, 400);
    if (!Array.isArray(body.products) || body.products.length === 0) {
      return json({ error: 'products must be a non-empty array.' }, 400);
    }

    const payload = {
      products: body.products,
      price_on_property: Array.isArray(body.price_on_property) ? body.price_on_property : [],
      quantity_on_property: Array.isArray(body.quantity_on_property) ? body.quantity_on_property : [],
      sku_on_property: Array.isArray(body.sku_on_property) ? body.sku_on_property : [],
      readiness_state_on_property: Array.isArray(body.readiness_state_on_property) ? body.readiness_state_on_property : []
    };
    const maxVariations = body.max_variations_supported === 3 ? 3 : 2;

    const before = await etsyFetch(`/listings/${listingId}/inventory`);
    const backup = await saveBackup(listingId, before);

    const result = await etsyFetch(`/listings/${listingId}/inventory?max_variations_supported=${maxVariations}`, {
      method: 'PUT',
      body: payload
    });
    const after = await etsyFetch(`/listings/${listingId}/inventory`);

    const expectedSignatures = new Set(payload.products.map(productSignature));
    const actualSignatures = new Set((after.products || []).map(productSignature));
    let matched = 0;
    for (const signature of expectedSignatures) if (actualSignatures.has(signature)) matched += 1;

    return json({
      result,
      backup: {
        created_at: backup.created_at,
        retained_backups: 10,
        before: inventorySummary(before)
      },
      verification: {
        expected: inventorySummary({ products: payload.products }),
        actual: inventorySummary(after),
        expected_product_count: payload.products.length,
        actual_product_count: (after.products || []).length,
        exact_product_signatures_matched: matched,
        exact_product_signatures_expected: expectedSignatures.size,
        product_count_match: (after.products || []).length === payload.products.length,
        all_expected_signatures_present: matched === expectedSignatures.size,
        price_on_property: after.price_on_property || [],
        quantity_on_property: after.quantity_on_property || [],
        sku_on_property: after.sku_on_property || [],
        readiness_state_on_property: after.readiness_state_on_property || []
      }
    });
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
