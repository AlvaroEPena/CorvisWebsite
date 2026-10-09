/** Worker bindings. All are optional; each feature resolves its own config and degrades safely. */
export interface Env {
  /** `production` or `development`. Unset means development: test Turnstile secret, no email sent. */
  ENVIRONMENT?: string;
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

/** Cloudflare's published always-pass Turnstile secret. Dev only; never a real check. */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

/** Empty strings count as unset, because `.dev.vars` templates ship with blank values. */
export function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** `production` uses the real services; anything else, including unset, is `development`. */
export type Mode = 'production' | 'development';

export function resolveMode(env: Env): Mode {
  return optionalValue(env.ENVIRONMENT)?.toLowerCase() === 'production'
    ? 'production'
    : 'development';
}

export type TurnstileConfig = { secret: string; isTestSecret: boolean };

/**
 * Development always uses Cloudflare's always-pass test secret, even when a real one is present, so
 * local testing never depends on (or spends) real keys. Production needs the real secret and fails
 * closed without it. Returns undefined in that case.
 */
export function resolveTurnstileConfig(env: Env): TurnstileConfig | undefined {
  if (resolveMode(env) === 'development') {
    return { secret: TURNSTILE_TEST_SECRET, isTestSecret: true };
  }
  const secret = optionalValue(env.TURNSTILE_SECRET_KEY);
  return secret === undefined ? undefined : { secret, isTestSecret: false };
}

export type MailConfig =
  { mode: 'demo' } | { mode: 'live'; apiKey: string; to: string; from: string };

export type MailConfigResult = { ok: true; mail: MailConfig } | { ok: false; problems: string[] };

const SIMPLE_ADDRESS = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const NAMED_ADDRESS = /^[^<>\r\n]+<[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+>$/;

/**
 * Development logs the lead and sends nothing (demo mode). Production sends through Resend and
 * reports every missing or invalid variable by name only, never by value.
 */
export function resolveMailConfig(env: Env): MailConfigResult {
  if (resolveMode(env) === 'development') return { ok: true, mail: { mode: 'demo' } };

  const apiKey = optionalValue(env.RESEND_API_KEY);
  const to = optionalValue(env.CONTACT_TO_EMAIL);
  const from = optionalValue(env.CONTACT_FROM_EMAIL);
  const problems: string[] = [];
  if (apiKey === undefined) problems.push('RESEND_API_KEY');
  if (to === undefined || !SIMPLE_ADDRESS.test(to)) problems.push('CONTACT_TO_EMAIL');
  if (from === undefined || !(SIMPLE_ADDRESS.test(from) || NAMED_ADDRESS.test(from))) {
    problems.push('CONTACT_FROM_EMAIL');
  }
  if (problems.length > 0 || apiKey === undefined || to === undefined || from === undefined) {
    return { ok: false, problems };
  }
  return { ok: true, mail: { mode: 'live', apiKey, to, from } };
}
