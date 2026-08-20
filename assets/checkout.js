(() => {
  const byId = (id) => document.getElementById(id);
  const panel = byId('checkoutPanel');
  if (!panel) return;

  let config = null;
  let paypalSdk = null;
  const paypalOrderMap = new Map();

  function setMessage(message, tone = 'info') {
    const node = byId('checkoutMessage');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone;
  }

  function collectOrder() {
    const file = byId('artUpload')?.files?.[0];
    return {
      customerName: byId('customerName')?.value || '',
      customerEmail: byId('customerEmail')?.value || '',
      orderType: byId('orderType')?.value || 'hat',
      family: byId('orderFamily')?.value || '',
      colorway: byId('colorway')?.value || '',
      patchShape: byId('patchShape')?.value || '',
      patchSize: byId('patchSize')?.value || '',
      patchPlacement: byId('patchPlacement')?.value || '',
      patchText: byId('patchText')?.value || '',
      orderNotes: byId('orderNotes')?.value || '',
      artworkName: file?.name || '',
      quantity: byId('quantity')?.value || '1',
    };
  }

  function localReadiness() {
    if (typeof window.getReadiness === 'function') return window.getReadiness();
    const order = collectOrder();
    const missing = [];
    if (!order.customerName.trim()) missing.push('name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customerEmail.trim())) missing.push('valid email');
    if (order.orderType === 'hat' && !order.colorway) missing.push('hat color');
    if (!order.patchText.trim() && !order.artworkName) missing.push('artwork or patch text');
    return { ready: missing.length === 0, missing };
  }

  function syncReadinessCopy() {
    const status = byId('orderStatus');
    const state = localReadiness();
    if (!status) return;
    status.classList.toggle('is-ready', state.ready);
    status.innerHTML = state.ready
      ? '<strong>Order ready for checkout.</strong> Review the summary, then choose a secure payment method below.'
      : `<strong>Almost ready.</strong> Add: ${state.missing.join(', ')}.`;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.details?.join(' ') || data?.error || 'Request failed.');
    return data;
  }

  async function prepareOrder() {
    const ready = localReadiness();
    if (!ready.ready) {
      syncReadinessCopy();
      throw new Error(`Please add ${ready.missing.join(', ')} before checkout.`);
    }
    setMessage('Preparing your secure order…');
    const data = await requestJson('/api/checkout/prepare', {
      method: 'POST',
      body: JSON.stringify(collectOrder()),
    });
    const orderIdNode = byId('checkoutOrderId');
    if (orderIdNode) orderIdNode.textContent = data.orderId;
    return data;
  }

  async function startStripeCheckout() {
    const button = byId('stripeCheckoutBtn');
    try {
      if (button) button.disabled = true;
      const prepared = await prepareOrder();
      setMessage('Opening secure Stripe checkout…');
      const session = await requestJson('/api/checkout/stripe', {
        method: 'POST',
        body: JSON.stringify({ orderId: prepared.orderId }),
      });
      window.location.assign(session.url);
    } catch (error) {
      setMessage(error.message || 'Could not start checkout.', 'error');
      if (button) button.disabled = false;
    }
  }

  async function createPayPalOrder() {
    const prepared = await prepareOrder();
    const created = await requestJson('/api/checkout/paypal/create', {
      method: 'POST',
      body: JSON.stringify({ orderId: prepared.orderId }),
    });
    paypalOrderMap.set(created.orderId, created.recMamaOrderId);
    return { orderId: created.orderId };
  }

  async function capturePayPalOrder({ orderId }) {
    const recMamaOrderId = paypalOrderMap.get(orderId);
    if (!recMamaOrderId) throw new Error('Could not match the PayPal approval to this order.');
    setMessage('Confirming PayPal payment…');
    const result = await requestJson('/api/checkout/paypal/capture', {
      method: 'POST',
      body: JSON.stringify({ orderId, recMamaOrderId }),
    });
    if (!result.paid) throw new Error('PayPal did not confirm payment.');
    window.location.assign(`/order-success.html?provider=paypal&order_id=${encodeURIComponent(result.orderId)}`);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-rmm-paypal="true"]`);
      if (existing) {
        if (window.paypal) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.rmmPaypal = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load PayPal checkout.'));
      document.head.appendChild(script);
    });
  }

  async function initPayPal() {
    if (!config?.enabled || !config?.paypal || !config?.paypalClientId || !config?.paypalSdkUrl) return;
    try {
      await loadScript(config.paypalSdkUrl);
      paypalSdk = await window.paypal.createInstance({
        clientId: config.paypalClientId,
        components: ['paypal-payments', 'venmo-payments'],
        pageType: 'checkout',
        locale: 'en-US',
        clientMetadataId: crypto.randomUUID(),
      });
      const eligible = await paypalSdk.findEligibleMethods({ currencyCode: 'USD' });
      const common = {
        onApprove: capturePayPalOrder,
        onCancel: () => setMessage('Payment was cancelled. Your order choices are still here.', 'info'),
        onError: (error) => setMessage(error?.message || 'PayPal checkout encountered an error.', 'error'),
      };

      if (eligible.isEligible('paypal')) {
        const button = byId('paypalButton');
        const session = paypalSdk.createPayPalOneTimePaymentSession(common);
        if (button) {
          button.hidden = false;
          button.addEventListener('click', async () => {
            try {
              await session.start({ presentationMode: 'auto' }, createPayPalOrder());
            } catch (error) {
              setMessage(error?.message || 'Could not start PayPal.', 'error');
            }
          });
        }
      }

      if (eligible.isEligible('venmo')) {
        const button = byId('venmoButton');
        const session = paypalSdk.createVenmoOneTimePaymentSession(common);
        if (button) {
          button.hidden = false;
          button.addEventListener('click', async () => {
            try {
              await session.start({ presentationMode: 'auto' }, createPayPalOrder());
            } catch (error) {
              setMessage(error?.message || 'Could not start Venmo.', 'error');
            }
          });
        }
      }
    } catch (error) {
      setMessage(`PayPal/Venmo setup: ${error.message || 'not available yet.'}`, 'error');
    }
  }

  function renderConfig() {
    const stripeButton = byId('stripeCheckoutBtn');
    const fallback = byId('etsyFallback');
    const live = Boolean(config?.enabled && (config?.stripe || config?.paypal));
    if (fallback) fallback.hidden = live;
    if (stripeButton) {
      stripeButton.hidden = !config?.stripe;
      stripeButton.disabled = !config?.enabled || !config?.stripe;
    }
    byId('paymentStripeMethods')?.classList.toggle('is-ready', Boolean(config?.stripe));
    byId('paymentPaypalMethods')?.classList.toggle('is-ready', Boolean(config?.paypal));

    if (!config?.enabled) {
      setMessage('Secure checkout is installed but not live yet. Merchant payment credentials and final shipping/tax settings still need to be connected.');
    } else if (!config?.stripe && !config?.paypal) {
      setMessage('Checkout is enabled, but no payment account is configured.', 'error');
    } else {
      setMessage('Secure checkout is ready. Choose a payment method below.', 'success');
    }
  }

  async function init() {
    syncReadinessCopy();
    document.querySelectorAll('#builder input, #builder select, #builder textarea').forEach((node) => {
      node.addEventListener('input', syncReadinessCopy);
      node.addEventListener('change', syncReadinessCopy);
    });
    byId('stripeCheckoutBtn')?.addEventListener('click', startStripeCheckout);

    try {
      config = await requestJson('/api/checkout/config');
      renderConfig();
      await initPayPal();
    } catch (error) {
      setMessage(`Checkout setup is temporarily unavailable: ${error.message}`, 'error');
    }
  }

  init();
})();
