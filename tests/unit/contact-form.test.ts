import { describe, expect, it } from 'vitest';
import { contactInputSchema, MIN_FILL_MS } from '../../src/lib/contracts/contact';
import {
  buildContactPayload,
  describeFailure,
  fieldErrorsFromIssues,
  firstInvalidField,
  normalizeWebsite,
  parseContactResponse,
} from '../../src/scripts/contact-form';

const EMAIL = 'hello@corvis.example';

function filledForm(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const values = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: '',
    website: 'example.com',
    service: 'redesign',
    budget: '',
    message: 'We need a new site for our studio.',
    consent: 'on',
    nickname: '',
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe('normalizeWebsite', () => {
  it('adds https when the scheme is missing and keeps full URLs', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com');
    expect(normalizeWebsite(' http://example.com ')).toBe('http://example.com');
    expect(normalizeWebsite('  ')).toBe('');
  });
});

describe('buildContactPayload', () => {
  it('produces a payload the shared schema accepts, dropping empty optionals', () => {
    const payload = buildContactPayload(filledForm(), 'token', MIN_FILL_MS + 1);
    expect(payload.company).toBeUndefined();
    expect(payload.budget).toBeUndefined();
    expect(payload.website).toBe('https://example.com');
    expect(contactInputSchema.safeParse(payload).success).toBe(true);
  });

  it('keeps an unchecked consent box invalid', () => {
    const form = filledForm();
    form.delete('consent');
    const result = contactInputSchema.safeParse(buildContactPayload(form, 'token', 5000));
    expect(result.success).toBe(false);
  });
});

describe('fieldErrorsFromIssues', () => {
  it('keeps the first message per field and replaces technical enum text', () => {
    const payload = buildContactPayload(filledForm({ service: '', name: '' }), '', 100);
    const result = contactInputSchema.safeParse(payload);
    if (result.success) throw new Error('expected failure');
    const errors = fieldErrorsFromIssues(result.error.issues);
    expect(errors.name).toBe('Please enter your name');
    expect(errors.service).toBe('Please choose what you need');
    expect(errors.turnstileToken).toBe('Please complete the check');
    expect(errors.elapsedMs).toBeDefined();
  });

  it('picks the first invalid field in visual order', () => {
    expect(firstInvalidField({ message: 'x', email: 'y' })).toBe('email');
    expect(firstInvalidField({})).toBeUndefined();
  });
});

describe('describeFailure', () => {
  it('maps server validation errors back to fields', () => {
    const view = describeFailure(
      { ok: false, error: 'validation', errors: { email: ['Bad email'] } },
      EMAIL,
    );
    expect(view.fieldErrors).toEqual({ email: 'Bad email' });
    expect(view.resetCheck).toBe(true);
  });

  it('gives each non-validation error a friendly message', () => {
    expect(describeFailure({ ok: false, error: 'turnstile' }, EMAIL).message).toMatch(
      /security check/,
    );
    expect(describeFailure({ ok: false, error: 'too_fast' }, EMAIL).message).toMatch(/quick/);
    expect(describeFailure({ ok: false, error: 'rate_limited' }, EMAIL).message).toContain(EMAIL);
    expect(describeFailure({ ok: false, error: 'send_failed' }, EMAIL).message).toContain(EMAIL);
  });

  it('handles a network failure without resetting the check', () => {
    const view = describeFailure(null, EMAIL);
    expect(view.message).toContain(EMAIL);
    expect(view.resetCheck).toBe(false);
  });
});

describe('parseContactResponse', () => {
  it('recognises success and failure bodies, and rejects unknown shapes', () => {
    expect(parseContactResponse({ ok: true }, 200)).toEqual({ ok: true });
    expect(parseContactResponse({ ok: false, error: 'turnstile' }, 403)).toEqual({
      ok: false,
      error: 'turnstile',
    });
    expect(parseContactResponse({ ok: true }, 500)).toBeNull();
    expect(parseContactResponse('nope', 200)).toBeNull();
    expect(parseContactResponse(null, 404)).toBeNull();
  });
});
