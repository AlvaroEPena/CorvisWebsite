/** Worker bindings. All are optional: missing values select dev/demo behaviour (see resolveConfig). */
export interface Env {
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

/** Cloudflare's published always-pass Turnstile secret. Dev only; never a real check. */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

export type MailConfig =
  { mode: 'demo' } | { mode: 'live'; apiKey: string; to: string; from: string };

export interface WorkerConfig {
  turnstileSecret: string;
  isTurnstileTestSecret: boolean;
  mail: MailConfig;
}

export type ConfigResult = { ok: true; config: WorkerConfig } | { ok: false; problems: string[] };

const SIMPLE_ADDRESS = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const NAMED_ADDRESS = /^[^<>\r\n]+<[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+>$/;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Turns raw bindings into a validated config. Empty strings count as unset, because
 * `.dev.vars` templates ship with blank values. Returns problem names only, never values.
 */
export function resolveConfig(env: Env): ConfigResult {
  const secret = clean(env.TURNSTILE_SECRET_KEY);
  const turnstile = {
    turnstileSecret: secret ?? TURNSTILE_TEST_SECRET,
    isTurnstileTestSecret: secret === undefined,
  };

  const apiKey = clean(env.RESEND_API_KEY);
  if (apiKey === undefined) {
    return { ok: true, config: { ...turnstile, mail: { mode: 'demo' } } };
  }

  const to = clean(env.CONTACT_TO_EMAIL);
  const from = clean(env.CONTACT_FROM_EMAIL);
  const problems: string[] = [];
  if (to === undefined || !SIMPLE_ADDRESS.test(to)) problems.push('CONTACT_TO_EMAIL');
  if (from === undefined || !(SIMPLE_ADDRESS.test(from) || NAMED_ADDRESS.test(from))) {
    problems.push('CONTACT_FROM_EMAIL');
  }
  if (problems.length > 0 || to === undefined || from === undefined) {
    return { ok: false, problems };
  }
  return { ok: true, config: { ...turnstile, mail: { mode: 'live', apiKey, to, from } } };
}
