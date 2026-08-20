import { env } from './_checkout-core.mjs';

export function paypalBase() {
  return env('PAYPAL_MODE').toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function paypalAccessToken() {
  const clientId = env('PAYPAL_CLIENT_ID');
  const secret = env('PAYPAL_CLIENT_SECRET');
  if (!clientId || !secret) throw new Error('PayPal is not configured yet.');
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  if (!response.ok || !data?.access_token) throw new Error(data?.error_description || 'Could not authenticate with PayPal.');
  return data.access_token;
}

export async function paypalFetch(path, options = {}) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBase()}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.details?.[0]?.description || data?.message || 'PayPal request failed.';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
