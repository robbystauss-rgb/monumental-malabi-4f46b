import { getStore } from '@netlify/blobs';

export default async () => {
  const store = getStore('rec-mama-etsy-auth');
  const prior = await store.get('approved-hat-migration-result', { type: 'json' });
  if (prior?.applied === true) {
    console.log('Approved hat migration already completed; skipping.');
    return;
  }

  const nonce = Netlify.env.get('HAT_MIGRATION_NONCE');
  const baseUrl = Netlify.env.get('URL') || 'https://recmamamade.netlify.app';
  if (!nonce) throw new Error('HAT_MIGRATION_NONCE is missing.');

  const response = await fetch(`${baseUrl}/.netlify/functions/etsy-approved-hat-migration?nonce=${encodeURIComponent(nonce)}`);
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

  await store.setJSON('approved-hat-migration-last-attempt', {
    at: new Date().toISOString(),
    status: response.status,
    payload,
  });

  if (!response.ok || payload?.applied !== true) {
    throw new Error(`Approved hat migration failed: ${response.status} ${text}`);
  }

  await store.setJSON('approved-hat-migration-result', {
    ...payload,
    completed_at: new Date().toISOString(),
  });

  console.log('Approved hat migration completed successfully.', JSON.stringify(payload));
};

export const config = {
  schedule: '* * * * *'
};
