import crypto from 'node:crypto';
import { tokenStore, json } from './_etsy.mjs';

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default async (request) => {
  try {
    const clientId = process.env.ETSY_API_KEY;
    const redirectUri = process.env.ETSY_REDIRECT_URI;
    if (!clientId || !redirectUri) return json({ error: 'OAuth is not configured yet.' }, 500);

    const state = base64url(crypto.randomBytes(32));
    const verifier = base64url(crypto.randomBytes(48));
    const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());

    const store = tokenStore();
    await store.setJSON(`oauth-${state}`, {
      verifier,
      created_at: Date.now(),
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'listings_r listings_w shops_r shops_w',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    return new Response(null, {
      status: 302,
      headers: { location: `https://www.etsy.com/oauth/connect?${params.toString()}` },
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
