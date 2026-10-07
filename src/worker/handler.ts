import { z } from 'zod';
import { MIN_FILL_MS, contactInputSchema, type ContactInput } from '../lib/contracts/contact';
import { readJsonBody } from './body';
import { resolveConfig, type Env, type WorkerConfig } from './env';
import { buildLeadEmail, createResendSender } from './mailer';
import type { RateLimiter } from './rate-limit';
import { jsonResponse } from './response';
import { verifyTurnstile } from './turnstile';

export const CONTACT_PATH = '/api/contact';
export const MAX_BODY_BYTES = 16 * 1024;

const LOG_PREFIX = '[corvis-contact]';

export interface HandlerDeps {
  fetch: typeof fetch;
  rateLimiter: RateLimiter;
  logger: Pick<Console, 'error' | 'warn'>;
}

export type RequestHandler = (request: Request, env: Env) => Promise<Response>;

/** Body-level problems reuse the contract's `validation` shape under a `_form` key. */
function formErrorResponse(message: string, status: number): Response {
  return jsonResponse({ ok: false, error: 'validation', errors: { _form: [message] } }, status);
}

function isHoneypotTripped(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null || !('nickname' in payload)) return false;
  return typeof payload.nickname === 'string' && payload.nickname.length > 0;
}

function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const { fieldErrors, formErrors } = z.flattenError(error);
  const errors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) errors[field] = messages;
  }
  if (formErrors.length > 0) errors._form = formErrors;
  return errors;
}

/** True when the only thing wrong with the payload is a submit faster than MIN_FILL_MS. */
function isTooFastOnly(payload: unknown, error: z.ZodError): boolean {
  if (typeof payload !== 'object' || payload === null || !('elapsedMs' in payload)) return false;
  const { elapsedMs } = payload;
  return (
    typeof elapsedMs === 'number' &&
    elapsedMs < MIN_FILL_MS &&
    error.issues.every((issue) => issue.path.length === 1 && issue.path[0] === 'elapsedMs')
  );
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (origin === null) return true; // non-browser clients send no Origin
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** Metadata only (email domain, lengths): enough to debug demo mode without logging personal data. */
function redactedSummary(lead: ContactInput): Record<string, unknown> {
  return {
    service: lead.service,
    budget: lead.budget ?? null,
    emailDomain: lead.email.split('@')[1] ?? null,
    hasCompany: Boolean(lead.company),
    hasWebsite: Boolean(lead.website),
    messageLength: lead.message.length,
  };
}

async function deliverLead(
  lead: ContactInput,
  config: WorkerConfig,
  deps: HandlerDeps,
): Promise<boolean> {
  const { mail } = config;
  if (mail.mode === 'demo') {
    deps.logger.warn(
      `${LOG_PREFIX} DEMO MODE: RESEND_API_KEY is not set, so this lead was NOT emailed.`,
      redactedSummary(lead),
    );
    return true;
  }

  try {
    const email = buildLeadEmail(lead, { from: mail.from, to: mail.to });
    await createResendSender(mail.apiKey, deps.fetch)(email);
    return true;
  } catch (error) {
    deps.logger.error(
      `${LOG_PREFIX} sending lead failed`,
      error instanceof Error ? error.message : 'unknown error',
    );
    return false;
  }
}

export function createContactHandler(deps: HandlerDeps): RequestHandler {
  return async (request, env) => {
    const { pathname } = new URL(request.url);

    if (pathname !== CONTACT_PATH) return jsonResponse({ ok: false, error: 'not_found' }, 404);
    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    }
    if (!isSameOrigin(request)) return jsonResponse({ ok: false, error: 'forbidden' }, 403);

    const ip = request.headers.get('CF-Connecting-IP');
    const limit = deps.rateLimiter.consume(ip ?? 'unknown');
    if (!limit.allowed) {
      return jsonResponse({ ok: false, error: 'rate_limited' }, 429, {
        'Retry-After': String(limit.retryAfterSeconds),
      });
    }

    if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
      return formErrorResponse('Request must be JSON', 400);
    }
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    if (body.kind === 'too_large') return formErrorResponse('Request is too large', 413);
    if (body.kind === 'invalid') return formErrorResponse('Request is not valid JSON', 400);

    // Silent success: do not tell bots that the honeypot gave them away.
    if (isHoneypotTripped(body.value)) return jsonResponse({ ok: true }, 200);

    const parsed = contactInputSchema.safeParse(body.value);
    if (!parsed.success) {
      if (isTooFastOnly(body.value, parsed.error)) {
        return jsonResponse({ ok: false, error: 'too_fast' }, 429);
      }
      return jsonResponse(
        { ok: false, error: 'validation', errors: toFieldErrors(parsed.error) },
        400,
      );
    }
    const lead = parsed.data;

    const configResult = resolveConfig(env);
    if (!configResult.ok) {
      deps.logger.error(`${LOG_PREFIX} invalid configuration:`, configResult.problems.join(', '));
      return jsonResponse({ ok: false, error: 'send_failed' }, 500);
    }
    const { config } = configResult;
    if (config.isTurnstileTestSecret) {
      deps.logger.warn(
        `${LOG_PREFIX} DEV: TURNSTILE_SECRET_KEY is not set; using the test secret.`,
      );
    }

    const isHuman = await verifyTurnstile({
      token: lead.turnstileToken,
      secret: config.turnstileSecret,
      remoteIp: ip,
      fetch: deps.fetch,
    });
    if (!isHuman) return jsonResponse({ ok: false, error: 'turnstile' }, 403);

    const isDelivered = await deliverLead(lead, config, deps);
    return isDelivered
      ? jsonResponse({ ok: true }, 200)
      : jsonResponse({ ok: false, error: 'send_failed' }, 502);
  };
}
