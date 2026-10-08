import { describe, expect, it } from 'vitest';
import {
  TURNSTILE_TEST_SECRET,
  resolveMailConfig,
  resolvePandaDocConfig,
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

describe('resolveTurnstileConfig', () => {
  it('uses the configured secret', () => {
    expect(resolveTurnstileConfig({ TURNSTILE_SECRET_KEY: 's' })).toEqual({
      secret: 's',
      isTestSecret: false,
    });
  });

  it('fails closed without a secret outside development', () => {
    expect(resolveTurnstileConfig({})).toBeUndefined();
    expect(resolveTurnstileConfig({ ENVIRONMENT: 'production' })).toBeUndefined();
  });

  it('falls back to the test secret only when ENVIRONMENT=development', () => {
    expect(resolveTurnstileConfig({ ENVIRONMENT: 'development' })).toEqual({
      secret: TURNSTILE_TEST_SECRET,
      isTestSecret: true,
    });
  });
});

describe('resolveMailConfig', () => {
  it('selects demo mode for an empty env', () => {
    expect(resolveMailConfig({})).toEqual({ ok: true, mail: { mode: 'demo' } });
  });

  it('selects live mode when the key and both addresses are valid', () => {
    expect(
      resolveMailConfig({
        RESEND_API_KEY: 'k',
        CONTACT_TO_EMAIL: 'owner@corvis.example',
        CONTACT_FROM_EMAIL: 'hello@corvis.example',
      }),
    ).toMatchObject({ ok: true, mail: { mode: 'live', to: 'owner@corvis.example' } });
  });

  it('reports only the names of invalid variables', () => {
    expect(
      resolveMailConfig({ RESEND_API_KEY: 'k', CONTACT_FROM_EMAIL: 'hello@corvis.example' }),
    ).toEqual({ ok: false, problems: ['CONTACT_TO_EMAIL'] });
  });
});

describe('resolvePandaDocConfig', () => {
  it('is disabled unless both the key and template id are set', () => {
    expect(resolvePandaDocConfig({})).toBeUndefined();
    expect(resolvePandaDocConfig({ PANDADOC_API_KEY: 'k' })).toBeUndefined();
    expect(resolvePandaDocConfig({ PANDADOC_TEMPLATE_ID: 't' })).toBeUndefined();
  });

  it('only auto-sends for the exact string "true"', () => {
    const base = { PANDADOC_API_KEY: 'k', PANDADOC_TEMPLATE_ID: 't' };
    expect(resolvePandaDocConfig({ ...base, PANDADOC_AUTO_SEND: 'true' })?.autoSend).toBe(true);
    expect(resolvePandaDocConfig({ ...base, PANDADOC_AUTO_SEND: 'yes' })?.autoSend).toBe(false);
    expect(resolvePandaDocConfig(base)?.autoSend).toBe(false);
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
