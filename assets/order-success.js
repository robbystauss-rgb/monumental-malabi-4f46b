(() => {
  const title = document.getElementById('successTitle');
  const message = document.getElementById('successMessage');
  const details = document.getElementById('successDetails');
  const params = new URLSearchParams(window.location.search);
  const provider = params.get('provider') || '';

  function money(cents) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
  }

  function showSuccess(data) {
    title.textContent = 'Payment confirmed — thank you!';
    message.textContent = 'Your REC Mama Made order has been recorded. Save the order reference below for your records.';
    details.innerHTML = `<strong>Order reference:</strong> ${data.orderId || 'Confirmed'}<br><strong>Payment method:</strong> ${data.provider === 'paypal' ? 'PayPal / Venmo' : 'Stripe secure checkout'}${data.subtotalCents != null ? `<br><strong>Order subtotal:</strong> ${money(data.subtotalCents)}` : ''}${data.fulfilledQuantity ? `<br><strong>Total items to fulfill:</strong> ${data.fulfilledQuantity}` : ''}`;
  }

  function showError(text) {
    title.textContent = 'We could not verify the payment yet.';
    message.textContent = text;
    details.innerHTML = '<strong>Do not submit a second payment yet.</strong><br>If you just completed checkout, refresh this page after a few seconds or contact REC Mama Made with your payment confirmation.';
  }

  async function verifyStripe() {
    const sessionId = params.get('session_id') || '';
    if (!sessionId) return showError('The Stripe checkout session reference is missing.');
    try {
      const response = await fetch(`/api/checkout/stripe/status?session_id=${encodeURIComponent(sessionId)}`);
      const data = await response.json();
      if (!response.ok || !data.paid) throw new Error(data.error || 'Stripe has not marked the payment paid yet.');
      showSuccess(data);
    } catch (error) {
      showError(error.message || 'Stripe payment verification is temporarily unavailable.');
    }
  }

  if (provider === 'stripe') {
    verifyStripe();
  } else if (provider === 'paypal') {
    const orderId = params.get('order_id') || '';
    if (orderId) showSuccess({ orderId, provider: 'paypal' });
    else showError('The REC Mama Made order reference is missing.');
  } else {
    showError('No payment provider was specified for this confirmation page.');
  }
})();
