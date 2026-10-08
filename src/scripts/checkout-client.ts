import type { CheckoutInput, CheckoutResponse } from '../lib/contracts/checkout';

/** Pure helpers for the deposit button (request shape, response parsing, failure copy). No DOM. */

export const CHECKOUT_ENDPOINT = '/api/checkout';

export function buildCheckoutRequest(packageId: string): { url: string; init: RequestInit } {
  const body: Pick<CheckoutInput, 'package'> = { package: packageId as CheckoutInput['package'] };
  return {
    url: CHECKOUT_ENDPOINT,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  };
}

/** Returns the parsed response, or null when the body is not our JSON shape. */
export function parseCheckoutResponse(body: unknown, status: number): CheckoutResponse | null {
  if (typeof body !== 'object' || body === null || !('ok' in body)) return null;
  const { ok } = body as { ok: unknown };
  if (ok === true) {
    const url = (body as { url?: unknown }).url;
    return status >= 200 && status < 300 && typeof url === 'string' ? { ok: true, url } : null;
  }
  return ok === false ? (body as CheckoutResponse) : null;
}

/** Only follow redirects to Stripe-hosted checkout or our own origin. */
export function isSafeCheckoutUrl(url: string, origin: string): boolean {
  try {
    const target = new URL(url, origin);
    return (
      target.protocol === 'https:' &&
      (target.hostname === 'checkout.stripe.com' || target.origin === origin)
    );
  } catch {
    return false;
  }
}

/** Friendly copy for every failure. `null` means the request never reached the Worker. */
export function describeCheckoutFailure(response: CheckoutResponse | null, email: string): string {
  if (response === null) {
    return `We could not reach the payment service. Check your connection and try again, or email ${email}.`;
  }
  if (response.ok) return '';
  switch (response.error) {
    case 'rate_limited':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'checkout_unavailable':
      return `Online deposits are not available right now. Book a free consult or email ${email} and we will send a payment link.`;
    default:
      return `We could not start the payment. Please try again, or email ${email}.`;
  }
}
