import { describe, expect, it } from 'vitest';
import { DEPOSIT_PACKAGES } from '../../../src/lib/contracts/checkout';
import { createRateLimiter } from '../../../src/worker/rate-limit';
import { STRIPE_API_VERSION } from '../../../src/worker/stripe-checkout';
import { SITE, STRIPE_SESSIONS_URL, createHarness, post } from './helpers';

const ENV = { STRIPE_SECRET_KEY: 'sk_test_123' };
const checkout = (body: unknown, headers: Record<string, string> = {}) =>
  post(body, { path: '/api/checkout', headers });

function sessionForm(network: ReturnType<typeof createHarness>['network']): URLSearchParams {
  return network.callsTo(STRIPE_SESSIONS_URL)[0]?.init.body as URLSearchParams;
}

describe('POST /api/checkout', () => {
  it('creates a hosted session and returns its url', async () => {
    const { handler, network } = createHarness();
    const response = await handler(checkout({ package: 'launch', email: 'ada@example.com' }), ENV);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });

    const call = network.callsTo(STRIPE_SESSIONS_URL)[0];
    const headers = call?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk_test_123');
    expect(headers['Stripe-Version']).toBe(STRIPE_API_VERSION);
    expect(headers['Idempotency-Key']).toMatch(/^corvis-checkout-[0-9a-f]{64}$/);

    const form = sessionForm(network);
    expect(form.get('mode')).toBe('payment');
    expect(form.get('customer_email')).toBe('ada@example.com');
    expect(form.get('metadata[package]')).toBe('launch');
    expect(form.get('success_url')).toBe(`${SITE}/thanks?session_id={CHECKOUT_SESSION_ID}`);
    expect(form.get('cancel_url')).toBe(`${SITE}/#pricing`);
  });

  it.each(Object.entries(DEPOSIT_PACKAGES))(
    'takes the %s amount and name from the server catalog',
    async (id, catalog) => {
      const { handler, network } = createHarness();
      await handler(checkout({ package: id }), ENV);
      const form = sessionForm(network);
      expect(form.get('line_items[0][price_data][unit_amount]')).toBe(
        String(catalog.depositUsdCents),
      );
      expect(form.get('line_items[0][price_data][currency]')).toBe('usd');
      expect(form.get('line_items[0][price_data][product_data][name]')).toBe(catalog.name);
      expect(form.get('line_items[0][quantity]')).toBe('1');
    },
  );

  it('ignores a client-supplied amount', async () => {
    const { handler, network } = createHarness();
    await handler(checkout({ package: 'launch', amount: 1, depositUsdCents: 1 }), ENV);
    expect(sessionForm(network).get('line_items[0][price_data][unit_amount]')).toBe(
      String(DEPOSIT_PACKAGES.launch.depositUsdCents),
    );
  });

  it('omits customer_email when none is given', async () => {
    const { handler, network } = createHarness();
    await handler(checkout({ package: 'launch' }), ENV);
    expect(sessionForm(network).has('customer_email')).toBe(false);
  });

  it('uses the same idempotency key for a repeated request within the window', async () => {
    const { handler, network } = createHarness({ now: () => 1_000_000 });
    await handler(checkout({ package: 'launch' }), ENV);
    await handler(checkout({ package: 'launch' }), ENV);
    await handler(checkout({ package: 'redesign' }), ENV);
    const keys = network
      .callsTo(STRIPE_SESSIONS_URL)
      .map((call) => (call.init.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it.each([
    ['unknown package', { package: 'enterprise' }],
    ['care package (no checkout)', { package: 'care' }],
    ['missing package', {}],
    ['bad email', { package: 'launch', email: 'nope' }],
  ])('rejects %s with 400 validation and no Stripe call', async (_name, body) => {
    const { handler, network } = createHarness();
    const response = await handler(checkout(body), ENV);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'validation' });
    expect(network.calls).toHaveLength(0);
  });

  it('rejects malformed JSON, non-JSON and oversized bodies', async () => {
    const { handler } = createHarness();
    expect((await handler(checkout('{oops'), ENV)).status).toBe(400);
    expect((await handler(checkout('x', { 'Content-Type': 'text/plain' }), ENV)).status).toBe(400);
    expect(
      (await handler(checkout({ package: 'launch', pad: 'x'.repeat(2000) }), ENV)).status,
    ).toBe(413);
  });

  it('answers 503 checkout_unavailable when STRIPE_SECRET_KEY is unset', async () => {
    const { handler, network } = createHarness();
    const response = await handler(checkout({ package: 'launch' }), {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: 'checkout_unavailable' });
    expect(network.calls).toHaveLength(0);
  });

  it('answers 502 checkout_failed on a Stripe error without leaking details', async () => {
    const { handler, logger } = createHarness({
      responders: {
        [`POST ${STRIPE_SESSIONS_URL}`]: () =>
          Response.json(
            { error: { type: 'invalid_request_error', message: 'secret-detail sk_test_123' } },
            { status: 400 },
          ),
      },
    });
    const response = await handler(checkout({ package: 'launch' }), ENV);
    const text = await response.text();
    expect(response.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ ok: false, error: 'checkout_failed' });
    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).toContain('HTTP 400');
    expect(logged).toContain('invalid_request_error');
    expect(logged).not.toContain('secret-detail');
    expect(logged).not.toContain('sk_test_123');
  });

  it('answers 502 when the Stripe response has no usable url', async () => {
    const { handler } = createHarness({
      responders: { [`POST ${STRIPE_SESSIONS_URL}`]: () => Response.json({ id: 'cs_1' }) },
    });
    expect((await handler(checkout({ package: 'launch' }), ENV)).status).toBe(502);
  });

  it('rejects cross-origin requests with 403', async () => {
    const { handler, network } = createHarness();
    const response = await handler(
      checkout({ package: 'launch' }, { Origin: 'https://evil.example' }),
      ENV,
    );
    expect(response.status).toBe(403);
    expect(network.calls).toHaveLength(0);
  });

  it('rate limits per IP with 429 rate_limited', async () => {
    const { handler } = createHarness({
      checkoutRateLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    const request = () => checkout({ package: 'launch' }, { 'CF-Connecting-IP': '198.51.100.9' });
    expect((await handler(request(), ENV)).status).toBe(200);
    const limited = await handler(request(), ENV);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ ok: false, error: 'rate_limited' });
  });

  it('answers non-POST with 405', async () => {
    const { handler } = createHarness();
    const response = await handler(new Request(`${SITE}/api/checkout`), ENV);
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
  });
});
