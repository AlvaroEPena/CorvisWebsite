import { z } from 'zod';
import { readBodyText } from './body';
import { LOG_PREFIX, type Logger, type RouteHandler } from './deps';
import { optionalValue, resolveMailConfig } from './env';
import { buildPaymentEmail, createResendSender, type PaidDeposit } from './mailer';
import { jsonResponse } from './response';
import { verifyStripeSignature } from './stripe-signature';

export const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;
const HANDLED_EVENT = 'checkout.session.completed';

/** Tracks handled event ids so a retried delivery does not email twice (per isolate, best effort). */
export interface ProcessedEvents {
  has(eventId: string): boolean;
  add(eventId: string): void;
}

export function createProcessedEvents(maxSize = 500): ProcessedEvents {
  const ids = new Set<string>();
  return {
    has: (eventId) => ids.has(eventId),
    add(eventId) {
      ids.add(eventId);
      if (ids.size > maxSize) {
        const oldest = ids.values().next();
        if (!oldest.done) ids.delete(oldest.value);
      }
    },
  };
}

export interface WebhookDeps {
  fetch: typeof fetch;
  logger: Logger;
  now: () => number;
  processedEvents: ProcessedEvents;
}

const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({ object: z.unknown() }),
});

const sessionSchema = z.object({
  id: z.string(),
  payment_status: z.string(),
  amount_total: z.number().nullish(),
  currency: z.string().nullish(),
  customer_email: z.string().nullish(),
  customer_details: z.object({ email: z.string().nullish() }).nullish(),
  metadata: z.record(z.string(), z.string()).nullish(),
});

function toPaidDeposit(session: z.infer<typeof sessionSchema>): PaidDeposit {
  return {
    sessionId: session.id,
    packageId: session.metadata?.package,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
    customerEmail: session.customer_details?.email ?? session.customer_email ?? undefined,
  };
}

export function createWebhookHandler(deps: WebhookDeps): RouteHandler {
  const acknowledge = () => jsonResponse({ received: true }, 200);

  return async (request, env) => {
    const secret = optionalValue(env.STRIPE_WEBHOOK_SECRET);
    if (secret === undefined) {
      deps.logger.error(`${LOG_PREFIX} STRIPE_WEBHOOK_SECRET is not set; rejecting webhook`);
      return jsonResponse({ ok: false, error: 'webhook_unavailable' }, 503);
    }

    // Raw text, not request.json(): the signature covers the exact bytes Stripe sent.
    const body = await readBodyText(request, MAX_WEBHOOK_BODY_BYTES);
    if (body.kind === 'too_large') return jsonResponse({ ok: false, error: 'bad_request' }, 413);

    const isAuthentic = await verifyStripeSignature({
      payload: body.text,
      header: request.headers.get('Stripe-Signature'),
      secret,
      nowMs: deps.now(),
    });
    if (!isAuthentic) {
      deps.logger.warn(`${LOG_PREFIX} Stripe webhook signature check failed`);
      return jsonResponse({ ok: false, error: 'invalid_signature' }, 400);
    }

    const event = parseJson(body.text, eventSchema);
    if (event === undefined) return jsonResponse({ ok: false, error: 'bad_request' }, 400);
    if (event.type !== HANDLED_EVENT) return acknowledge();

    const session = sessionSchema.safeParse(event.data.object);
    if (!session.success) return jsonResponse({ ok: false, error: 'bad_request' }, 400);
    // Asynchronous methods complete before they are paid; wait for the paid state.
    if (session.data.payment_status !== 'paid') return acknowledge();
    if (deps.processedEvents.has(event.id)) return acknowledge();

    const mailConfig = resolveMailConfig(env);
    if (!mailConfig.ok) {
      deps.logger.error(`${LOG_PREFIX} invalid configuration:`, mailConfig.problems.join(', '));
      return jsonResponse({ ok: false, error: 'send_failed' }, 500);
    }
    const { mail } = mailConfig;
    const deposit = toPaidDeposit(session.data);

    if (mail.mode === 'demo') {
      deps.logger.warn(
        `${LOG_PREFIX} DEMO MODE: RESEND_API_KEY is not set, so the paid deposit was NOT emailed.`,
        { sessionId: deposit.sessionId, packageId: deposit.packageId ?? null },
      );
      return acknowledge();
    }

    try {
      const email = buildPaymentEmail(deposit, { from: mail.from, to: mail.to });
      await createResendSender(mail.apiKey, deps.fetch)(email);
    } catch (error) {
      // Non-2xx makes Stripe retry the delivery for up to three days.
      deps.logger.error(
        `${LOG_PREFIX} sending payment notice failed`,
        error instanceof Error ? error.message : 'unknown error',
      );
      return jsonResponse({ ok: false, error: 'send_failed' }, 500);
    }
    deps.processedEvents.add(event.id);
    return acknowledge();
  };
}

function parseJson<T>(text: string, schema: z.ZodType<T>): T | undefined {
  try {
    const result = schema.safeParse(JSON.parse(text));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
