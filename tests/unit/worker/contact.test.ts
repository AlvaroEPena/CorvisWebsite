import { describe, expect, it, vi } from 'vitest';
import { MAX_BODY_BYTES } from '../../../src/worker/handler';
import { createRateLimiter } from '../../../src/worker/rate-limit';
import {
  LIVE_ENV,
  RESEND_URL,
  SITE,
  TURNSTILE_URL,
  createHarness,
  post,
  validPayload,
} from './helpers';

async function bodyOf(response: Response): Promise<unknown> {
  return response.json();
}

describe('POST /api/contact: success path', () => {
  it('verifies Turnstile, emails the owner with reply-to, and returns ok', async () => {
    const { handler, network } = createHarness();
    const response = await handler(
      post(validPayload(), { headers: { 'CF-Connecting-IP': '203.0.113.7' } }),
      LIVE_ENV,
    );

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ ok: true });

    const [turnstileCall] = network.callsTo(TURNSTILE_URL);
    const form = turnstileCall?.init.body as URLSearchParams;
    expect(form.get('secret')).toBe('turnstile-secret');
    expect(form.get('response')).toBe('token-123');
    expect(form.get('remoteip')).toBe('203.0.113.7');

    const [resendCall] = network.callsTo(RESEND_URL);
    const headers = resendCall?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_test_key');
    const mail = JSON.parse(resendCall?.init.body as string);
    expect(mail).toMatchObject({
      from: 'Corvis <hello@corvis.example>',
      to: ['owner@corvis.example'],
      reply_to: 'ada@example.com',
      subject: 'New Corvis inquiry: Ada Lovelace (Website redesign)',
    });
    expect(mail.text).toContain('Company: Analytical Engines');
    expect(mail.text).toContain('Budget: $3k to $6k');
    expect(mail.text).toContain('We would like a calm, fast new site.');
    expect(mail.html).toContain('Ada Lovelace');
  });

  it('omits the remoteip field when no client IP header is present', async () => {
    const { handler, network } = createHarness();
    await handler(post(validPayload()), LIVE_ENV);
    const form = network.callsTo(TURNSTILE_URL)[0]?.init.body as URLSearchParams;
    expect(form.has('remoteip')).toBe(false);
  });

  it('sets JSON, no-store and no CORS headers', async () => {
    const { handler } = createHarness();
    const response = await handler(post(validPayload()), LIVE_ENV);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

describe('validation', () => {
  it('returns 400 with flattened field errors and sends nothing', async () => {
    const { handler, network } = createHarness();
    const response = await handler(
      post(validPayload({ name: 'A', email: 'nope', message: 'short' })),
      LIVE_ENV,
    );

    expect(response.status).toBe(400);
    const body = (await bodyOf(response)) as {
      ok: boolean;
      error: string;
      errors: Record<string, string[]>;
    };
    expect(body.ok).toBe(false);
    expect(body.error).toBe('validation');
    expect(Object.keys(body.errors).sort()).toEqual(['email', 'message', 'name']);
    expect(network.calls).toHaveLength(0);
  });

  it('requires consent and a Turnstile token', async () => {
    const { handler } = createHarness();
    const response = await handler(
      post(validPayload({ consent: false, turnstileToken: '' })),
      LIVE_ENV,
    );
    const body = (await bodyOf(response)) as { errors: Record<string, string[]> };
    expect(response.status).toBe(400);
    expect(Object.keys(body.errors).sort()).toEqual(['consent', 'turnstileToken']);
  });

  it('treats a missing elapsedMs as a validation error, not too_fast', async () => {
    const { handler } = createHarness();
    const payload = validPayload();
    delete payload.elapsedMs;
    const response = await handler(post(payload), LIVE_ENV);
    expect(response.status).toBe(400);
  });

  it('reports a non-object JSON body as a validation error', async () => {
    const { handler } = createHarness();
    const response = await handler(post('[1,2,3]'), LIVE_ENV);
    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toMatchObject({ ok: false, error: 'validation' });
  });
});

describe('spam protection', () => {
  it('answers a filled honeypot with silent success and sends nothing', async () => {
    const { handler, network } = createHarness();
    const response = await handler(post(validPayload({ nickname: 'bot' })), LIVE_ENV);
    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ ok: true });
    expect(network.calls).toHaveLength(0);
  });

  it('answers a filled honeypot with success even if other fields are invalid', async () => {
    const { handler, network } = createHarness();
    const response = await handler(post({ nickname: 'bot' }), LIVE_ENV);
    expect(await bodyOf(response)).toEqual({ ok: true });
    expect(network.calls).toHaveLength(0);
  });

  it('maps a too-fast submit to 429 too_fast without calling any service', async () => {
    const { handler, network } = createHarness();
    const response = await handler(post(validPayload({ elapsedMs: 500 })), LIVE_ENV);
    expect(response.status).toBe(429);
    expect(await bodyOf(response)).toEqual({ ok: false, error: 'too_fast' });
    expect(network.calls).toHaveLength(0);
  });

  it('prefers field errors over too_fast when other fields are also invalid', async () => {
    const { handler } = createHarness();
    const response = await handler(post(validPayload({ elapsedMs: 500, name: '' })), LIVE_ENV);
    expect(response.status).toBe(400);
  });

  it('rejects with 403 turnstile when siteverify says no, and sends no mail', async () => {
    const { handler, network } = createHarness({
      turnstile: () => Response.json({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    const response = await handler(post(validPayload()), LIVE_ENV);
    expect(response.status).toBe(403);
    expect(await bodyOf(response)).toEqual({ ok: false, error: 'turnstile' });
    expect(network.callsTo(RESEND_URL)).toHaveLength(0);
  });

  it('treats a Turnstile outage as a failed check', async () => {
    const { handler, network } = createHarness({
      turnstile: () => new Response('boom', { status: 500 }),
    });
    const response = await handler(post(validPayload()), LIVE_ENV);
    expect(response.status).toBe(403);
    expect(network.callsTo(RESEND_URL)).toHaveLength(0);
  });

  it('treats a thrown Turnstile request as a failed check', async () => {
    const { handler, logger } = createHarness({
      turnstile: () => {
        throw new TypeError('network down');
      },
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handler(post(validPayload()), LIVE_ENV);
    expect(response.status).toBe(403);
    expect(errorSpy).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('Resend failures', () => {
  it('returns 502 send_failed without leaking provider details or the message', async () => {
    const { handler, logger } = createHarness({
      resend: () =>
        new Response('{"message":"domain not verified secret-detail"}', { status: 403 }),
    });
    const response = await handler(post(validPayload()), LIVE_ENV);
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ ok: false, error: 'send_failed' });
    expect(text).not.toContain('secret-detail');

    const logged = JSON.stringify(logger.error.mock.calls);
    expect(logged).toContain('HTTP 403');
    expect(logged).not.toContain('calm, fast new site');
    expect(logged).not.toContain('re_test_key');
  });

  it('returns 502 when the Resend request throws', async () => {
    const { handler } = createHarness({
      resend: () => {
        throw new TypeError('network down');
      },
    });
    const response = await handler(post(validPayload()), LIVE_ENV);
    expect(response.status).toBe(502);
  });

  it('returns 500 send_failed when the sender configuration is invalid', async () => {
    const { handler, network, logger } = createHarness();
    const response = await handler(post(validPayload()), {
      ...LIVE_ENV,
      CONTACT_TO_EMAIL: '',
      CONTACT_FROM_EMAIL: 'not an address',
    });
    expect(response.status).toBe(500);
    expect(await bodyOf(response)).toEqual({ ok: false, error: 'send_failed' });
    expect(logger.error.mock.calls.flat().join(' ')).toContain('CONTACT_TO_EMAIL');
    expect(network.callsTo(RESEND_URL)).toHaveLength(0);
  });
});

describe('demo / dev mode', () => {
  it('returns ok without sending when RESEND_API_KEY is unset, logging a redacted summary', async () => {
    const { handler, network, logger } = createHarness();
    const response = await handler(post(validPayload()), { TURNSTILE_SECRET_KEY: 'real' });

    expect(response.status).toBe(200);
    expect(await bodyOf(response)).toEqual({ ok: true });
    expect(network.callsTo(RESEND_URL)).toHaveLength(0);

    const logged = JSON.stringify(logger.warn.mock.calls);
    expect(logged).toContain('DEMO MODE');
    expect(logged).toContain('example.com');
    expect(logged).not.toContain('ada@example.com');
    expect(logged).not.toContain('Ada Lovelace');
    expect(logged).not.toContain('calm, fast new site');
  });

  it('uses the Turnstile test secret when none is configured, and warns', async () => {
    const { handler, network, logger } = createHarness();
    await handler(post(validPayload()), {});
    const form = network.callsTo(TURNSTILE_URL)[0]?.init.body as URLSearchParams;
    expect(form.get('secret')).toBe('1x0000000000000000000000000000000AA');
    expect(JSON.stringify(logger.warn.mock.calls)).toContain('TURNSTILE_SECRET_KEY');
  });

  it('treats blank env values as unset', async () => {
    const { handler, network } = createHarness();
    const response = await handler(post(validPayload()), {
      RESEND_API_KEY: '  ',
      TURNSTILE_SECRET_KEY: '',
    });
    expect(response.status).toBe(200);
    expect(network.callsTo(RESEND_URL)).toHaveLength(0);
  });
});

describe('routing and methods', () => {
  it.each(['GET', 'PUT', 'DELETE', 'OPTIONS'])(
    'answers %s with 405 and an Allow header',
    async (method) => {
      const { handler } = createHarness();
      const response = await handler(new Request(`${SITE}/api/contact`, { method }), LIVE_ENV);
      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('POST');
      expect(response.headers.get('Content-Type')).toContain('application/json');
    },
  );

  it('answers unknown /api/* paths with a JSON 404', async () => {
    const { handler } = createHarness();
    const response = await handler(post({}, { path: '/api/other' }), LIVE_ENV);
    expect(response.status).toBe(404);
    expect(await bodyOf(response)).toEqual({ ok: false, error: 'not_found' });
  });

  it('answers non-/api paths with 404', async () => {
    const { handler } = createHarness();
    const response = await handler(new Request(`${SITE}/`), LIVE_ENV);
    expect(response.status).toBe(404);
  });
});

describe('origin check', () => {
  it('rejects a cross-origin Origin header with 403', async () => {
    const { handler, network } = createHarness();
    const response = await handler(
      post(validPayload(), { headers: { Origin: 'https://evil.example' } }),
      LIVE_ENV,
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(network.calls).toHaveLength(0);
  });

  it('rejects the opaque "null" origin', async () => {
    const { handler } = createHarness();
    const response = await handler(post(validPayload(), { headers: { Origin: 'null' } }), LIVE_ENV);
    expect(response.status).toBe(403);
  });

  it('accepts a matching Origin', async () => {
    const { handler } = createHarness();
    const response = await handler(post(validPayload(), { headers: { Origin: SITE } }), LIVE_ENV);
    expect(response.status).toBe(200);
  });
});

describe('request body limits', () => {
  it('rejects non-JSON content types with 400', async () => {
    const { handler } = createHarness();
    const response = await handler(
      post('name=Ada', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
      LIVE_ENV,
    );
    expect(response.status).toBe(400);
  });

  it('rejects malformed JSON with 400', async () => {
    const { handler } = createHarness();
    const response = await handler(post('{not json'), LIVE_ENV);
    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toMatchObject({ ok: false, error: 'validation' });
  });

  it('rejects an empty body with 400', async () => {
    const { handler } = createHarness();
    const response = await handler(
      new Request(`${SITE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
      LIVE_ENV,
    );
    expect(response.status).toBe(400);
  });

  it('rejects oversized bodies with 413', async () => {
    const { handler, network } = createHarness();
    const response = await handler(
      post(validPayload({ message: 'x'.repeat(MAX_BODY_BYTES) })),
      LIVE_ENV,
    );
    expect(response.status).toBe(413);
    expect(network.calls).toHaveLength(0);
  });

  it('rejects oversized bodies by declared Content-Length without reading them', async () => {
    const { handler } = createHarness();
    const response = await handler(
      post('{}', { headers: { 'Content-Length': String(MAX_BODY_BYTES + 1) } }),
      LIVE_ENV,
    );
    expect(response.status).toBe(413);
  });
});

describe('HTML escaping of hostile input', () => {
  it('escapes every visitor-supplied field in the HTML body', async () => {
    const { handler, network } = createHarness();
    const hostile = '<img src=x onerror=alert(1)>"\'&';
    const response = await handler(
      post(
        validPayload({
          name: `<script>alert(1)</script>`,
          company: hostile,
          website: 'javascript://%0Aalert(1)',
          message: `${hostile}\n<b>bold</b>`,
        }),
      ),
      LIVE_ENV,
    );
    expect(response.status).toBe(200);

    const mail = JSON.parse(network.callsTo(RESEND_URL)[0]?.init.body as string);
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).not.toContain('<b>bold</b>');
    expect(mail.html).not.toContain('<a ');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;');
    // The plain-text body keeps the raw characters.
    expect(mail.text).toContain('<b>bold</b>');
  });

  it('keeps control characters out of the subject line', async () => {
    const { handler, network } = createHarness();
    await handler(post(validPayload({ name: 'Ada\r\nBcc: evil@example.com' })), LIVE_ENV);
    const mail = JSON.parse(network.callsTo(RESEND_URL)[0]?.init.body as string);
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});

describe('rate limiting', () => {
  it('returns 429 rate_limited with Retry-After after the per-IP limit', async () => {
    let time = 0;
    const rateLimiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: () => time });
    const { handler } = createHarness({ rateLimiter });
    const request = () => post(validPayload(), { headers: { 'CF-Connecting-IP': '198.51.100.1' } });

    expect((await handler(request(), LIVE_ENV)).status).toBe(200);
    expect((await handler(request(), LIVE_ENV)).status).toBe(200);

    time = 10_000;
    const limited = await handler(request(), LIVE_ENV);
    expect(limited.status).toBe(429);
    expect(await bodyOf(limited)).toEqual({ ok: false, error: 'rate_limited' });
    expect(limited.headers.get('Retry-After')).toBe('50');
  });

  it('tracks IPs independently', async () => {
    const rateLimiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const { handler } = createHarness({ rateLimiter });
    const from = (ip: string) => post(validPayload(), { headers: { 'CF-Connecting-IP': ip } });

    expect((await handler(from('198.51.100.1'), LIVE_ENV)).status).toBe(200);
    expect((await handler(from('198.51.100.2'), LIVE_ENV)).status).toBe(200);
    expect((await handler(from('198.51.100.1'), LIVE_ENV)).status).toBe(429);
  });
});
