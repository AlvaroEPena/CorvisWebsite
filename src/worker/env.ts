/** Worker bindings. All are optional; each feature resolves its own config and degrades safely. */
export interface Env {
  /** `development` (set only via .dev.vars) unlocks the Turnstile test secret. */
  ENVIRONMENT?: string;
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  TURNSTILE_SECRET_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PANDADOC_API_KEY?: string;
  PANDADOC_TEMPLATE_ID?: string;
  PANDADOC_AUTO_SEND?: string;
}

/** Cloudflare's published always-pass Turnstile secret. Dev only; never a real check. */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

/** Empty strings count as unset, because `.dev.vars` templates ship with blank values. */
export function optionalValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function isDevelopment(env: Env): boolean {
  return optionalValue(env.ENVIRONMENT) === 'development';
}

export type TurnstileConfig = { secret: string; isTestSecret: boolean };

/**
 * Fails closed: without a real secret the check only runs in explicit development mode,
 * where Cloudflare's always-pass test secret is used. Returns undefined otherwise.
 */
export function resolveTurnstileConfig(env: Env): TurnstileConfig | undefined {
  const secret = optionalValue(env.TURNSTILE_SECRET_KEY);
  if (secret !== undefined) return { secret, isTestSecret: false };
  return isDevelopment(env) ? { secret: TURNSTILE_TEST_SECRET, isTestSecret: true } : undefined;
}

export type MailConfig =
  { mode: 'demo' } | { mode: 'live'; apiKey: string; to: string; from: string };

export type MailConfigResult = { ok: true; mail: MailConfig } | { ok: false; problems: string[] };

const SIMPLE_ADDRESS = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const NAMED_ADDRESS = /^[^<>\r\n]+<[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+>$/;

/** Demo mode when no Resend key is set. Returns variable names only, never values. */
export function resolveMailConfig(env: Env): MailConfigResult {
  const apiKey = optionalValue(env.RESEND_API_KEY);
  if (apiKey === undefined) return { ok: true, mail: { mode: 'demo' } };

  const to = optionalValue(env.CONTACT_TO_EMAIL);
  const from = optionalValue(env.CONTACT_FROM_EMAIL);
  const problems: string[] = [];
  if (to === undefined || !SIMPLE_ADDRESS.test(to)) problems.push('CONTACT_TO_EMAIL');
  if (from === undefined || !(SIMPLE_ADDRESS.test(from) || NAMED_ADDRESS.test(from))) {
    problems.push('CONTACT_FROM_EMAIL');
  }
  if (problems.length > 0 || to === undefined || from === undefined) {
    return { ok: false, problems };
  }
  return { ok: true, mail: { mode: 'live', apiKey, to, from } };
}

export interface PandaDocConfig {
  apiKey: string;
  templateId: string;
  autoSend: boolean;
}

/** PandaDoc is optional: both the API key and the template id must be set. */
export function resolvePandaDocConfig(env: Env): PandaDocConfig | undefined {
  const apiKey = optionalValue(env.PANDADOC_API_KEY);
  const templateId = optionalValue(env.PANDADOC_TEMPLATE_ID);
  if (apiKey === undefined || templateId === undefined) return undefined;
  return { apiKey, templateId, autoSend: optionalValue(env.PANDADOC_AUTO_SEND) === 'true' };
}
