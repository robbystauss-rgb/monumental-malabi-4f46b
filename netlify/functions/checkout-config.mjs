import { checkoutState, env, json } from './_checkout-core.mjs';

export default async () => {
  const state = checkoutState();
  return json({
    enabled: state.enabled,
    stripe: state.stripeConfigured,
    paypal: state.paypalConfigured,
    paypalMode: state.paypalMode,
    paypalClientId: state.paypalConfigured ? env('PAYPAL_CLIENT_ID') : '',
    paypalSdkUrl: state.paypalMode === 'live'
      ? 'https://www.paypal.com/web-sdk/v6/core'
      : 'https://www.sandbox.paypal.com/web-sdk/v6/core',
    methods: {
      stripe: ['card', 'apple_pay', 'google_pay', 'cash_app_pay'],
      paypal: ['paypal', 'venmo'],
    },
  });
};

export const config = { path: '/api/checkout/config' };
