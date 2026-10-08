import { describe, expect, it } from 'vitest';
import { depositFor } from '../../src/content/deposits';
import { pricing } from '../../src/content/pricing';
import { DEPOSIT_PACKAGES, checkoutInputSchema } from '../../src/lib/contracts/checkout';
import {
  CHECKOUT_ENDPOINT,
  buildCheckoutRequest,
  describeCheckoutFailure,
  isSafeCheckoutUrl,
  parseCheckoutResponse,
} from '../../src/scripts/checkout-client';

const EMAIL = 'hello@corvis.example';

describe('buildCheckoutRequest', () => {
  it('posts only the package id, never a price', () => {
    const { url, init } = buildCheckoutRequest('launchpad');
    expect(url).toBe(CHECKOUT_ENDPOINT);
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ package: 'launchpad' });
    expect(checkoutInputSchema.safeParse(body).success).toBe(true);
  });
});

describe('parseCheckoutResponse', () => {
  it('accepts a success body with a url and rejects malformed ones', () => {
    expect(parseCheckoutResponse({ ok: true, url: 'https://checkout.stripe.com/x' }, 200)).toEqual({
      ok: true,
      url: 'https://checkout.stripe.com/x',
    });
    expect(parseCheckoutResponse({ ok: true }, 200)).toBeNull();
    expect(parseCheckoutResponse({ ok: false, error: 'rate_limited' }, 429)).toEqual({
      ok: false,
      error: 'rate_limited',
    });
    expect(parseCheckoutResponse('x', 200)).toBeNull();
  });
});

describe('isSafeCheckoutUrl', () => {
  it('only allows Stripe checkout or the same origin over https', () => {
    const origin = 'https://corvis.example';
    expect(isSafeCheckoutUrl('https://checkout.stripe.com/c/pay/abc', origin)).toBe(true);
    expect(isSafeCheckoutUrl('https://corvis.example/thanks', origin)).toBe(true);
    expect(isSafeCheckoutUrl('https://evil.example/pay', origin)).toBe(false);
    expect(isSafeCheckoutUrl('javascript:alert(1)', origin)).toBe(false);
    expect(isSafeCheckoutUrl('http://checkout.stripe.com/x', origin)).toBe(false);
  });
});

describe('describeCheckoutFailure', () => {
  it('maps every error to friendly copy', () => {
    expect(describeCheckoutFailure(null, EMAIL)).toContain(EMAIL);
    expect(describeCheckoutFailure({ ok: false, error: 'rate_limited' }, EMAIL)).toMatch(/wait/);
    expect(describeCheckoutFailure({ ok: false, error: 'checkout_unavailable' }, EMAIL)).toMatch(
      /not available/,
    );
    expect(describeCheckoutFailure({ ok: false, error: 'checkout_failed' }, EMAIL)).toContain(
      EMAIL,
    );
    expect(describeCheckoutFailure({ ok: false, error: 'validation' }, EMAIL)).toContain(EMAIL);
  });
});

describe('depositFor', () => {
  it('derives the label amount from the contract and skips care', () => {
    expect(depositFor('launchpad')?.amountUsd).toBe(
      DEPOSIT_PACKAGES.launchpad.depositUsdCents / 100,
    );
    expect(depositFor('market-leader')?.placeholder).toBe(true);
    expect(depositFor('care')).toBeUndefined();
  });
  it('covers every deposit package that exists in pricing', () => {
    const ids = pricing.map((pkg) => pkg.id);
    for (const id of Object.keys(DEPOSIT_PACKAGES)) expect(ids).toContain(id);
  });
});
