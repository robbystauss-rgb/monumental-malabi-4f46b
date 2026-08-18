import { getStore } from '@netlify/blobs';
import runMigration from './etsy-expand-hat-variations.mjs';

export default async () => {
  const store = getStore('rec-mama-etsy-auth');
  const done = await store.get('hat-expand-188-result', { type: 'json' });
  if (done?.applied === true) return;

  const nonce = Netlify.env.get('HAT_EXPAND_NONCE') || '';
  if (!nonce) throw new Error('Missing HAT_EXPAND_NONCE');

  const req = new Request(`https://recmamamade.netlify.app/.netlify/functions/etsy-expand-hat-variations?nonce=${encodeURIComponent(nonce)}`);
  const response = await runMigration(req);
  const payload = await response.json();
  await store.setJSON('hat-expand-188-last-attempt', { status: response.status, payload, at: new Date().toISOString() });
  if (!response.ok || payload?.applied !== true) throw new Error(`Hat expansion failed: ${response.status} ${JSON.stringify(payload)}`);
  await store.setJSON('hat-expand-188-result', { ...payload, completed_at: new Date().toISOString() });
};

export const config = { schedule: '* * * * *' };
