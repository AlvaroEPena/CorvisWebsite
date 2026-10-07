import { describe, expect, it } from 'vitest';
import { resolveConfig } from '../../../src/worker/env';
import { escapeHtml } from '../../../src/worker/escape';
import { createRateLimiter } from '../../../src/worker/rate-limit';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    );
  });

  it('does not double-escape plain text and leaves it unchanged', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123');
  });
});

describe('resolveConfig', () => {
  it('selects demo mode and the test Turnstile secret for an empty env', () => {
    const result = resolveConfig({});
    expect(result).toMatchObject({
      ok: true,
      config: { mail: { mode: 'demo' }, isTurnstileTestSecret: true },
    });
  });

  it('selects live mode when the key and both addresses are valid', () => {
    const result = resolveConfig({
      RESEND_API_KEY: 'k',
      CONTACT_TO_EMAIL: 'owner@corvis.example',
      CONTACT_FROM_EMAIL: 'hello@corvis.example',
      TURNSTILE_SECRET_KEY: 's',
    });
    expect(result).toMatchObject({
      ok: true,
      config: { mail: { mode: 'live', to: 'owner@corvis.example' }, turnstileSecret: 's' },
    });
  });

  it('reports only the names of invalid variables', () => {
    expect(
      resolveConfig({ RESEND_API_KEY: 'k', CONTACT_FROM_EMAIL: 'hello@corvis.example' }),
    ).toEqual({
      ok: false,
      problems: ['CONTACT_TO_EMAIL'],
    });
  });
});

describe('createRateLimiter', () => {
  it('slides: allows again once old hits leave the window', () => {
    let time = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => time });
    expect(limiter.consume('ip').allowed).toBe(true);
    time = 500;
    expect(limiter.consume('ip').allowed).toBe(true);
    time = 900;
    expect(limiter.consume('ip')).toEqual({ allowed: false, retryAfterSeconds: 1 });
    time = 1001;
    expect(limiter.consume('ip').allowed).toBe(true);
  });

  it('bounds memory by evicting stale and then oldest keys', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0, maxKeys: 2 });
    limiter.consume('a');
    limiter.consume('b');
    limiter.consume('c'); // over capacity: 'a' (least recent) is dropped
    expect(limiter.consume('a').allowed).toBe(true);
    expect(limiter.consume('c').allowed).toBe(false);
  });
});
