import { describe, expect, it } from 'vitest';
import {
  TURNSTILE_TEST_SECRET,
  resolveMailConfig,
  resolveMode,
  resolveTurnstileConfig,
} from '../../../src/worker/env';
import { escapeHtml } from '../../../src/worker/escape';
import { createRateLimiter } from '../../../src/worker/rate-limit';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    );
  });

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123');
  });
});

describe('resolveMode', () => {
  it('is development unless ENVIRONMENT is exactly production', () => {
    expect(resolveMode({})).toBe('development');
    expect(resolveMode({ ENVIRONMENT: '' })).toBe('development');
    expect(resolveMode({ ENVIRONMENT: 'development' })).toBe('development');
    expect(resolveMode({ ENVIRONMENT: 'prod' })).toBe('development');
    expect(resolveMode({ ENVIRONMENT: ' Production ' })).toBe('production');
  });
});

describe('resolveTurnstileConfig', () => {
  it('uses the configured secret in production', () => {
    expect(
      resolveTurnstileConfig({ ENVIRONMENT: 'production', TURNSTILE_SECRET_KEY: 's' }),
    ).toEqual({
      secret: 's',
      isTestSecret: false,
    });
  });

  it('fails closed in production without a secret', () => {
    expect(resolveTurnstileConfig({ ENVIRONMENT: 'production' })).toBeUndefined();
  });

  it('uses the test secret in development, even when a real one is present', () => {
    const expected = { secret: TURNSTILE_TEST_SECRET, isTestSecret: true };
    expect(resolveTurnstileConfig({})).toEqual(expected);
    expect(resolveTurnstileConfig({ TURNSTILE_SECRET_KEY: 'real' })).toEqual(expected);
  });
});

describe('resolveMailConfig', () => {
  const production = { ENVIRONMENT: 'production' };

  it('selects demo mode in development, even with a key', () => {
    expect(resolveMailConfig({})).toEqual({ ok: true, mail: { mode: 'demo' } });
    expect(resolveMailConfig({ RESEND_API_KEY: 'k' })).toEqual({
      ok: true,
      mail: { mode: 'demo' },
    });
  });

  it('selects live mode in production when the key and both addresses are valid', () => {
    expect(
      resolveMailConfig({
        ...production,
        RESEND_API_KEY: 'k',
        CONTACT_TO_EMAIL: 'owner@corvis.example',
        CONTACT_FROM_EMAIL: 'Corvis <hello@corvis.example>',
      }),
    ).toMatchObject({ ok: true, mail: { mode: 'live', to: 'owner@corvis.example' } });
  });

  it('reports only the names of missing or invalid variables in production', () => {
    expect(
      resolveMailConfig({
        ...production,
        RESEND_API_KEY: 'k',
        CONTACT_FROM_EMAIL: 'hello@corvis.example',
      }),
    ).toEqual({ ok: false, problems: ['CONTACT_TO_EMAIL'] });
    expect(resolveMailConfig(production)).toEqual({
      ok: false,
      problems: ['RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL'],
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
