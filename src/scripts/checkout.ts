import {
  buildCheckoutRequest,
  describeCheckoutFailure,
  isSafeCheckoutUrl,
  parseCheckoutResponse,
} from './checkout-client';

/** Wires every `[data-deposit]` button: POST the package id, then hand off to Stripe Checkout. */
const status = document.querySelector<HTMLElement>('[data-checkout-error]');
const email = status?.dataset.email ?? '';

function showError(message: string): void {
  if (!status) return;
  status.hidden = !message;
  status.textContent = message;
}

async function startCheckout(button: HTMLButtonElement): Promise<void> {
  const packageId = button.dataset.deposit ?? '';
  const label = button.textContent ?? '';
  showError('');
  button.disabled = true;
  button.textContent = 'Opening secure checkout…';
  try {
    const { url, init } = buildCheckoutRequest(packageId);
    const reply = await fetch(url, init);
    const body: unknown = await reply.json().catch(() => null);
    const outcome = parseCheckoutResponse(body, reply.status);
    if (outcome?.ok && isSafeCheckoutUrl(outcome.url, location.origin)) {
      location.assign(outcome.url);
      return;
    }
    showError(describeCheckoutFailure(outcome?.ok ? null : outcome, email));
  } catch {
    showError(describeCheckoutFailure(null, email));
  }
  button.disabled = false;
  button.textContent = label;
}

document.querySelectorAll<HTMLButtonElement>('[data-deposit]').forEach((button) => {
  button.addEventListener('click', () => void startCheckout(button));
});
