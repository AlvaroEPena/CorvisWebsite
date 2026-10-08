import type { ContactResponse } from '../lib/contracts/contact';

/** Pure helpers for the contact form (validation mapping, payload, failure copy). No DOM here. */

export type FieldErrors = Partial<Record<string, string>>;

/** Visual/DOM order of the validated fields; the first invalid one receives focus. */
export const FIELD_ORDER = [
  'name',
  'email',
  'company',
  'website',
  'service',
  'budget',
  'message',
  'consent',
  'turnstileToken',
] as const;

/** Enum fields would otherwise surface Zod's technical "Invalid option" text. */
const FRIENDLY_MESSAGES: FieldErrors = {
  service: 'Please choose what you need',
  budget: 'Please choose a budget range',
};

interface IssueLike {
  path: readonly PropertyKey[];
  message: string;
}

/** Keeps the first message per field. `elapsedMs` is surfaced by the caller as a general error. */
export function fieldErrorsFromIssues(issues: readonly IssueLike[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !(field in errors)) errors[field] = FRIENDLY_MESSAGES[field] ?? issue.message;
  }
  return errors;
}

/**
 * Splits validation errors into per-field errors and the "submitted too fast" flag.
 * Field errors win: the too-fast notice applies only when the form is otherwise valid.
 */
export function splitSubmitErrors(errors: FieldErrors): {
  fieldErrors: FieldErrors;
  isTooFast: boolean;
} {
  const { elapsedMs, ...fieldErrors } = errors;
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  return { fieldErrors, isTooFast: Boolean(elapsedMs) && !hasFieldErrors };
}

export function firstInvalidField(errors: FieldErrors): string | undefined {
  return FIELD_ORDER.find((field) => errors[field]);
}

/** Accepts "example.com" by assuming https, since the schema requires a full URL. */
export function normalizeWebsite(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

const text = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '');
const optional = (value: string): string | undefined => (value.trim() ? value.trim() : undefined);

/** Builds the object validated by the shared `contactInputSchema` and sent to the Worker. */
export function buildContactPayload(form: FormData, turnstileToken: string, elapsedMs: number) {
  return {
    name: text(form.get('name')),
    email: text(form.get('email')).trim(),
    company: optional(text(form.get('company'))),
    website: optional(normalizeWebsite(text(form.get('website')))),
    service: text(form.get('service')),
    budget: optional(text(form.get('budget'))),
    message: text(form.get('message')),
    consent: form.get('consent') === 'on',
    turnstileToken,
    nickname: text(form.get('nickname')),
    elapsedMs,
  };
}

export interface FailureView {
  message: string;
  fieldErrors: FieldErrors;
  /** Turnstile tokens are single-use, so a failed attempt needs a fresh challenge. */
  resetCheck: boolean;
}

/** Friendly copy for every non-ok outcome. `null` means the request never reached the Worker. */
export function describeFailure(response: ContactResponse | null, email: string): FailureView {
  const fallback = `Something went wrong on our side. Please try again, or email ${email}.`;
  if (response === null) {
    return {
      message: `We could not reach the server. Check your connection and try again, or email ${email}.`,
      fieldErrors: {},
      resetCheck: false,
    };
  }
  if (response.ok) return { message: '', fieldErrors: {}, resetCheck: false };

  switch (response.error) {
    case 'validation': {
      const fieldErrors = Object.fromEntries(
        Object.entries(response.errors).flatMap(([field, messages]) =>
          messages[0] ? [[field, messages[0]]] : [],
        ),
      );
      return { message: 'Please check the highlighted fields.', fieldErrors, resetCheck: true };
    }
    case 'turnstile':
      return {
        message: 'The security check did not pass. Please complete it again and resend.',
        fieldErrors: {},
        resetCheck: true,
      };
    case 'too_fast':
      return {
        message: 'That was a little quick. Take a moment to review your message, then send again.',
        fieldErrors: {},
        resetCheck: true,
      };
    case 'rate_limited':
      return {
        message: `Too many messages from this connection. Please wait a few minutes or email ${email}.`,
        fieldErrors: {},
        resetCheck: true,
      };
    default:
      return { message: fallback, fieldErrors: {}, resetCheck: true };
  }
}

/** Parses a fetch Response into a ContactResponse, or null when the body is not our JSON shape. */
export function parseContactResponse(body: unknown, status: number): ContactResponse | null {
  if (typeof body !== 'object' || body === null || !('ok' in body)) return null;
  if (status >= 200 && status < 300 && (body as { ok: unknown }).ok === true) return { ok: true };
  return (body as { ok: unknown }).ok === false ? (body as ContactResponse) : null;
}
