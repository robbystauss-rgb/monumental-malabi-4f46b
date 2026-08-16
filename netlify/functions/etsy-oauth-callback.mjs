import { tokenStore, saveTokens, json } from './_etsy.mjs';

export default async (request) => {
  try {
    const url = new URL(request.url);
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    if (error) {
      return new Response(`<!doctype html><html><body style="font-family:Arial;padding:40px"><h1>Etsy authorization failed</h1><p>${error}</p><p>${errorDescription || ''}</p></body></html>`, {
        status: 400,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return json({ error: 'Missing Etsy OAuth code or state.' }, 400);

    const store = tokenStore();
    const authState = await store.get(`oauth-${state}`, { type: 'json' });
    if (!authState?.verifier) return json({ error: 'OAuth state is invalid or expired.' }, 400);
    if (Date.now() - Number(authState.created_at || 0) > 15 * 60 * 1000) {
      await store.delete(`oauth-${state}`);
      return json({ error: 'OAuth request expired. Start authorization again.' }, 400);
    }

    const redirectUri = process.env.ETSY_REDIRECT_URI;
    const clientId = process.env.ETSY_API_KEY;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: authState.verifier,
    });

    const response = await fetch('https://openapi.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const payload = await response.json();
    if (!response.ok) return json({ error: 'Etsy token exchange failed.', details: payload }, response.status);

    await saveTokens(payload);
    await store.delete(`oauth-${state}`);

    return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>REC Mama Made Etsy Connected</title></head><body style="font-family:Arial;background:#2b1f1a;color:#f1e5d7;min-height:100vh;display:grid;place-items:center;margin:0"><main style="max-width:620px;padding:32px;border:1px solid #c3a15a;border-radius:18px;background:#3f3028"><h1 style="color:#c3a15a">Etsy connected successfully.</h1><p>REC Mama Made has authorized the private connector with listing and shop read/write access.</p><p>You can close this tab and return to ChatGPT.</p></main></body></html>`, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
