import { json, requireConnectorAuth, getSavedTokens, resolveMyShop, safeError } from './_etsy.mjs';

function authDiagnostics(request) {
  const auth = request.headers.get('authorization') || '';
  const expected = process.env.CONNECTOR_API_KEY || '';
  const receivedToken = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  return {
    auth_header_present: Boolean(auth),
    auth_scheme: auth ? auth.split(' ')[0] : null,
    received_token_length: receivedToken.length,
    expected_token_length: expected.length,
    received_token_suffix: receivedToken ? receivedToken.slice(-4) : null,
    expected_token_suffix: expected ? expected.slice(-4) : null,
    exact_match: receivedToken === expected,
  };
}

export default async (request) => {
  if (!requireConnectorAuth(request)) {
    return json({ error: 'Unauthorized', diagnostics: authDiagnostics(request) }, 401);
  }
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
