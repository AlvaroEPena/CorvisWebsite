import { describe, expect, it } from 'vitest';
import { SIGNATURE_TOLERANCE_SECONDS } from '../../../src/worker/stripe-signature';
import {
  LIVE_ENV,
  RESEND_URL,
  SITE,
  WEBHOOK_SECRET,
  createHarness,
  stripeSignatureHeader,
} from './helpers';

const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;
const ENV = { ...LIVE_ENV, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET };

function event(overrides: Record<string, unknown> = {}, session: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        payment_status: 'paid',
        amount_total: 120_000,
        currency: 'usd',
        customer_details: { email: 'ada@example.com' },
        metadata: { package: 'launch' },
        ...session,
      },
    },
    ...overrides,
  });
}

async function webhook(
  payload: string,
  options: { header?: string | null; secret?: string; timestamp?: number } = {},
): Promise<Request> {
  const header =
    options.header === undefined
      ? await stripeSignatureHeader(
          payload,
          options.secret ?? WEBHOOK_SECRET,
          options.timestamp ?? NOW_S,
        )
      : options.header;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (header !== null) headers['Stripe-Signature'] = header;
  return new Request(`${SITE}/api/stripe-webhook`, { method: 'POST', headers, body: payload });
}

const harness = () => createHarness({ now: () => NOW_MS });

describe('POST /api/stripe-webhook: signature', () => {
  it('accepts a valid signature and emails the owner', async () => {
    const { handler, network } = harness();
    const response = await handler(await webhook(event()), ENV);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    const mail = network.jsonBodyOf(RESEND_URL) as Record<string, string | string[]>;
    expect(mail.to).toEqual(['owner@corvis.example']);
    expect(mail.from).toBe('Corvis <hello@corvis.example>');
    expect(mail.reply_to).toBe('ada@example.com');
    expect(mail.subject).toBe('Corvis deposit paid: Launch: project deposit ($1,200.00)');
    expect(mail.text).toContain('Customer email: ada@example.com');
    expect(mail.text).toContain('Stripe session: cs_test_1');
  });

  it('accepts when any one of several v1 signatures matches (secret rolling)', async () => {
    const { handler, network } = harness();
    const payload = event();
    const good = await stripeSignatureHeader(payload, WEBHOOK_SECRET, NOW_S);
    const header = `t=${NOW_S},v1=${'0'.repeat(64)},${good.split(',')[1]},v0=ignored`;
    const response = await handler(await webhook(payload, { header }), ENV);
    expect(response.status).toBe(200);
    expect(network.callsTo(RESEND_URL)).toHaveLength(1);
  });

  it('rejects a signature made with the wrong secret', async () => {
    const { handler, network } = harness();
    const response = await handler(await webhook(event(), { secret: 'whsec_other' }), ENV);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'invalid_signature' });
    expect(network.calls).toHaveLength(0);
  });

  it('rejects a payload that was altered after signing', async () => {
    const { handler, network } = harness();
    const header = await stripeSignatureHeader(event(), WEBHOOK_SECRET, NOW_S);
    const response = await handler(await webhook(event({}, { amount_total: 1 }), { header }), ENV);
    expect(response.status).toBe(400);
    expect(network.calls).toHaveLength(0);
  });

  it.each([
    ['missing header', null],
    ['garbage header', 'nonsense'],
    ['no v1 scheme', `t=${NOW_S},v0=${'a'.repeat(64)}`],
    ['non-hex v1', `t=${NOW_S},v1=zzzz`],
  ])('rejects a %s', async (_name, header) => {
    const { handler, network } = harness();
    const response = await handler(await webhook(event(), { header }), ENV);
    expect(response.status).toBe(400);
    expect(network.calls).toHaveLength(0);
  });

  it('rejects a stale timestamp even with a valid signature', async () => {
    const { handler, network } = harness();
    const stale = NOW_S - SIGNATURE_TOLERANCE_SECONDS - 1;
    const response = await handler(await webhook(event(), { timestamp: stale }), ENV);
    expect(response.status).toBe(400);
    expect(network.calls).toHaveLength(0);
  });

  it('rejects a far-future timestamp and accepts one at the edge of the tolerance', async () => {
    const { handler } = harness();
    const future = NOW_S + SIGNATURE_TOLERANCE_SECONDS + 1;
    expect((await handler(await webhook(event(), { timestamp: future }), ENV)).status).toBe(400);
    const edge = NOW_S - SIGNATURE_TOLERANCE_SECONDS;
    expect((await handler(await webhook(event(), { timestamp: edge }), ENV)).status).toBe(200);
  });

  it('answers 503 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    const { handler, network, logger } = harness();
    const response = await handler(await webhook(event()), LIVE_ENV);
    expect(response.status).toBe(503);
    expect(network.calls).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it('rejects oversized bodies with 413', async () => {
    const { handler } = harness();
    const response = await handler(await webhook(event({ pad: 'x'.repeat(300_000) })), ENV);
    expect(response.status).toBe(413);
  });

  it('does not apply the Origin check (server-to-server)', async () => {
    const { handler } = harness();
    const request = await webhook(event());
    request.headers.set('Origin', 'https://stripe.com');
    expect((await handler(request, ENV)).status).toBe(200);
  });
});

describe('POST /api/stripe-webhook: events', () => {
  it('acknowledges other event types without emailing', async () => {
    const { handler, network } = harness();
    const response = await handler(
      await webhook(event({ type: 'payment_intent.created', data: { object: {} } })),
      ENV,
    );
    expect(response.status).toBe(200);
    expect(network.calls).toHaveLength(0);
  });

  it('acknowledges completed sessions that are not paid yet without emailing', async () => {
    const { handler, network } = harness();
    const response = await handler(await webhook(event({}, { payment_status: 'unpaid' })), ENV);
    expect(response.status).toBe(200);
    expect(network.calls).toHaveLength(0);
  });

  it('answers 400 for a validly signed but malformed event', async () => {
    const { handler } = harness();
    expect((await handler(await webhook('{"hello":1}'), ENV)).status).toBe(400);
    expect((await handler(await webhook('not json'), ENV)).status).toBe(400);
    expect(
      (await handler(await webhook(event({}, { payment_status: undefined })), ENV)).status,
    ).toBe(400);
  });

  it('does not email twice when Stripe redelivers the same event', async () => {
    const { handler, network } = harness();
    await handler(await webhook(event()), ENV);
    const retry = await handler(await webhook(event()), ENV);
    expect(retry.status).toBe(200);
    expect(network.callsTo(RESEND_URL)).toHaveLength(1);
  });

  it('returns 500 so Stripe retries when the owner email fails, then succeeds on retry', async () => {
    let shouldFail = true;
    const { handler, network, logger } = createHarness({
      now: () => NOW_MS,
      responders: {
        [`POST ${RESEND_URL}`]: () =>
          shouldFail ? new Response('nope', { status: 500 }) : Response.json({ id: 'e' }),
      },
    });
    const first = await handler(await webhook(event()), ENV);
    expect(first.status).toBe(500);
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('ada@example.com');

    shouldFail = false;
    expect((await handler(await webhook(event()), ENV)).status).toBe(200);
    expect(network.callsTo(RESEND_URL)).toHaveLength(2);
  });

  it('escapes hostile Stripe values in the HTML body', async () => {
    const { handler, network } = harness();
    await handler(
      await webhook(
        event(
          {},
          {
            metadata: { package: '<script>alert(1)</script>' },
            customer_details: { email: '"><img src=x onerror=1>@example.com' },
          },
        ),
      ),
      ENV,
    );
    const mail = network.jsonBodyOf(RESEND_URL) as Record<string, string>;
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('logs a demo-mode notice instead of emailing when Resend is not configured', async () => {
    const { handler, network, logger } = harness();
    const response = await handler(await webhook(event()), {
      STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    });
    expect(response.status).toBe(200);
    expect(network.calls).toHaveLength(0);
    const logged = JSON.stringify(logger.warn.mock.calls);
    expect(logged).toContain('DEMO MODE');
    expect(logged).not.toContain('ada@example.com');
  });
});
