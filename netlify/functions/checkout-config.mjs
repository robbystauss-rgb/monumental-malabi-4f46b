import { checkoutState, json } from './_checkout-core.mjs';

export default async () => {
  const state = checkoutState();
  return json({
    enabled: state.enabled,
    stripe: state.stripeConfigured,
    paypal: state.paypalConfigured,
    paypalMode: state.paypalMode,
    methods: {
      stripe: ['card', 'apple_pay', 'google_pay', 'cash_app_pay'],
      paypal: ['paypal', 'venmo'],
    },
  });
};

export const config = { path: '/api/checkout/config' };
