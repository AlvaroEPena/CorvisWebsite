import { DEPOSIT_PACKAGES, type DepositPackageId } from '../lib/contracts/checkout';

const CHECKOUT_SESSIONS_URL = 'https://api.stripe.com/v1/checkout/sessions';
/** Pinned so Stripe's response shape cannot change under us (https://docs.stripe.com/api/versioning). */
export const STRIPE_API_VERSION = '2026-09-30.endive';
const TIMEOUT_MS = 10_000;
const IDEMPOTENCY_BUCKET_MS = 5 * 60 * 1000;

interface CheckoutSessionOptions {
  secretKey: string;
  packageId: DepositPackageId;
  email: string | undefined;
  /** Origin of this site; Stripe returns the customer to pages under it. */
  origin: string;
  successPath: string;
  cancelPath: string;
  nowMs: number;
  fetch: typeof fetch;
}

/** Amount and name come from the server-side catalog; the client only picks a package id. */
function buildSessionForm(options: CheckoutSessionOptions): URLSearchParams {
  const { name, depositUsdCents } = DEPOSIT_PACKAGES[options.packageId];
  const form = new URLSearchParams({
    mode: 'payment',
    // Stripe substitutes the literal {CHECKOUT_SESSION_ID} placeholder after form-decoding.
    success_url: `${options.origin}${options.successPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${options.origin}${options.cancelPath}`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(depositUsdCents),
    'line_items[0][price_data][product_data][name]': name,
    'metadata[package]': options.packageId,
  });
  if (options.email) form.set('customer_email', options.email);
  return form;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Same package + email within a 5-minute window maps to one key, so a double click returns the
 * same Checkout Session instead of creating two. The email is hashed to keep it out of Stripe logs.
 */
async function idempotencyKey(options: CheckoutSessionOptions): Promise<string> {
  const bucket = Math.floor(options.nowMs / IDEMPOTENCY_BUCKET_MS);
  const fingerprint = await sha256Hex(`${options.packageId}|${options.email ?? ''}|${bucket}`);
  return `corvis-checkout-${fingerprint}`;
}

/** Creates a hosted Checkout Session and returns its URL. Throws a safe-to-log Error on failure. */
export async function createCheckoutSession(options: CheckoutSessionOptions): Promise<string> {
  const response = await options.fetch(CHECKOUT_SESSIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.secretKey}`,
      'Stripe-Version': STRIPE_API_VERSION,
      'Idempotency-Key': await idempotencyKey(options),
    },
    body: buildSessionForm(options),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Stripe checkout session failed (HTTP ${response.status}${errorType(result)})`);
  }

  const url = typeof result === 'object' && result !== null && 'url' in result ? result.url : null;
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error('Stripe checkout session response had no usable url');
  }
  return url;
}

/** Stripe's machine-readable error category (e.g. invalid_request_error); never the message text. */
function errorType(result: unknown): string {
  if (typeof result !== 'object' || result === null || !('error' in result)) return '';
  const { error } = result;
  if (typeof error !== 'object' || error === null || !('type' in error)) return '';
  return typeof error.type === 'string' ? `, ${error.type}` : '';
}
