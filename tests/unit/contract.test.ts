import { describe, expect, it } from 'vitest';
import { contactInputSchema, MIN_FILL_MS } from '../../src/lib/contracts/contact';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  service: 'redesign',
  message: 'We need a new site for our studio.',
  consent: true,
  turnstileToken: 'tok',
  elapsedMs: MIN_FILL_MS + 500,
};

describe('contactInputSchema', () => {
  it('accepts a valid payload', () => {
    expect(contactInputSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects a filled honeypot', () => {
    expect(contactInputSchema.safeParse({ ...valid, nickname: 'bot' }).success).toBe(false);
  });
  it('rejects missing consent and too-fast submits', () => {
    expect(contactInputSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(contactInputSchema.safeParse({ ...valid, elapsedMs: 100 }).success).toBe(false);
  });
});

describe('contactInputSchema website', () => {
  it('rejects non-http(s) schemes', () => {
    const base = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      service: 'redesign',
      message: 'We need a new site for our studio.',
      consent: true,
      turnstileToken: 'tok',
      elapsedMs: MIN_FILL_MS + 500,
    };
    expect(contactInputSchema.safeParse({ ...base, website: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(contactInputSchema.safeParse({ ...base, website: 'https://example.com' }).success).toBe(
      true,
    );
  });
});
