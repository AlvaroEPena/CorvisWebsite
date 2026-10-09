import { z } from 'zod';
import { MIN_FILL_MS, contactInputSchema, type ContactInput } from '../lib/contracts/contact';
import { readJsonBody } from './body';
import { LOG_PREFIX, type Logger, type RouteHandler } from './deps';
import { resolveMailConfig, resolveTurnstileConfig, type MailConfig } from './env';
import { clientIp, hasJsonContentType, isSameOrigin } from './guards';
import { buildLeadEmail, createResendSender } from './mailer';
import type { RateLimiter } from './rate-limit';
import { jsonResponse } from './response';
import { verifyTurnstile } from './turnstile';

export const MAX_BODY_BYTES = 16 * 1024;

export interface ContactDeps {
  fetch: typeof fetch;
  rateLimiter: RateLimiter;
  logger: Logger;
}

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

async function deliverLead(lead: ContactInput, mail: MailConfig, deps: ContactDeps) {
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

export function createContactHandler(deps: ContactDeps): RouteHandler {
  return async (request, env) => {
    if (!isSameOrigin(request)) return jsonResponse({ ok: false, error: 'forbidden' }, 403);

    const ip = clientIp(request);
    const limit = deps.rateLimiter.consume(ip ?? 'unknown');
    if (!limit.allowed) {
      return jsonResponse({ ok: false, error: 'rate_limited' }, 429, {
        'Retry-After': String(limit.retryAfterSeconds),
      });
    }

    if (!hasJsonContentType(request)) return formErrorResponse('Request must be JSON', 400);
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

    // Fail closed: a missing Turnstile secret must never silently disable the bot check.
    const turnstile = resolveTurnstileConfig(env);
    if (turnstile === undefined) {
      deps.logger.error(`${LOG_PREFIX} TURNSTILE_SECRET_KEY is not set; refusing to accept leads`);
      return jsonResponse({ ok: false, error: 'send_failed' }, 500);
    }
    if (turnstile.isTestSecret) {
      deps.logger.warn(
        `${LOG_PREFIX} DEV: using the Turnstile test secret (ENVIRONMENT=development)`,
      );
    }

    const mailConfig = resolveMailConfig(env);
    if (!mailConfig.ok) {
      deps.logger.error(`${LOG_PREFIX} invalid configuration:`, mailConfig.problems.join(', '));
      return jsonResponse({ ok: false, error: 'send_failed' }, 500);
    }

    const isHuman = await verifyTurnstile({
      token: lead.turnstileToken,
      secret: turnstile.secret,
      remoteIp: ip,
      fetch: deps.fetch,
      logger: deps.logger,
    });
    if (!isHuman) return jsonResponse({ ok: false, error: 'turnstile' }, 403);

    if (!(await deliverLead(lead, mailConfig.mail, deps))) {
      return jsonResponse({ ok: false, error: 'send_failed' }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  };
}
