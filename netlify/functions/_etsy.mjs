import { getStore } from '@netlify/blobs';

const ETSY_API = 'https://openapi.etsy.com/v3/application';
const ETSY_TOKEN_URL = 'https://openapi.etsy.com/v3/public/oauth/token';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export function requireConnectorAuth(request) {
  const expected = required('CONNECTOR_API_KEY');
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${expected}`) return false;
  return true;
}

export function etsyApiKeyHeader() {
  return `${required('ETSY_API_KEY')}:${required('ETSY_SHARED_SECRET')}`;
}

export function tokenStore() {
  return getStore('rec-mama-etsy-auth');
}

export async function getSavedTokens() {
  const store = tokenStore();
  const raw = await store.get('tokens', { type: 'json' });
  return raw || null;
}

export async function saveTokens(tokens) {
  const store = tokenStore();
  const normalized = {
    ...tokens,
    expires_at: Date.now() + (Number(tokens.expires_in || 3600) * 1000),
  };
  await store.setJSON('tokens', normalized);
  return normalized;
}

export async function refreshTokens(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: required('ETSY_API_KEY'),
    refresh_token: refreshToken,
  });
  const response = await fetch(ETSY_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Etsy token refresh failed: ${response.status} ${JSON.stringify(payload)}`);
  return saveTokens(payload);
}

export async function getAccessToken() {
  let tokens = await getSavedTokens();
  if (!tokens?.access_token) throw new Error('Etsy is not authorized yet. Complete the OAuth connection first.');
  if (!tokens.expires_at || tokens.expires_at < Date.now() + 120000) {
    if (!tokens.refresh_token) throw new Error('No Etsy refresh token is stored. Re-authorize Etsy.');
    tokens = await refreshTokens(tokens.refresh_token);
  }
  return tokens.access_token;
}

export async function etsyFetch(path, { method = 'GET', body, form = false, headers = {} } = {}) {
  const accessToken = await getAccessToken();
  const requestHeaders = {
    'x-api-key': etsyApiKeyHeader(),
    'authorization': `Bearer ${accessToken}`,
    ...headers,
  };
  let requestBody = body;
  if (body && form) {
    requestHeaders['content-type'] = 'application/x-www-form-urlencoded';
    requestBody = body instanceof URLSearchParams ? body : new URLSearchParams(body);
  } else if (body && !(body instanceof FormData)) {
    requestHeaders['content-type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }
  const response = await fetch(`${ETSY_API}${path}`, { method, headers: requestHeaders, body: requestBody });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  if (!response.ok) {
    const error = new Error(`Etsy API failed: ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function resolveMyShop() {
  const me = await etsyFetch('/users/me');
  const userId = me.user_id;
  if (!userId) throw new Error('Could not resolve Etsy user ID.');
  const shop = await etsyFetch(`/users/${encodeURIComponent(userId)}/shops`);
  return { me, shop };
}

export function safeError(error) {
  return {
    error: error?.message || 'Unknown error',
    details: error?.payload || undefined,
  };
}
