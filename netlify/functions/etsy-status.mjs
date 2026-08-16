import { json, requireConnectorAuth, getSavedTokens, resolveMyShop, safeError } from './_etsy.mjs';

export default async (request) => {
  if (!requireConnectorAuth(request)) return json({ error: 'Unauthorized' }, 401);
  try {
    const tokens = await getSavedTokens();
    if (!tokens?.access_token) return json({ connected: false, message: 'Etsy OAuth has not been completed.' });
    const { me, shop } = await resolveMyShop();
    return json({
      connected: true,
      user_id: me.user_id,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      title: shop.title,
      announcement: shop.announcement,
      token_expires_at: tokens.expires_at,
    });
  } catch (error) {
    return json(safeError(error), error.status || 500);
  }
};
