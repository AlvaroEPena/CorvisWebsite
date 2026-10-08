import {
  CHECKOUT_CANCEL_PATH,
  CHECKOUT_SUCCESS_PATH,
  checkoutInputSchema,
} from '../lib/contracts/checkout';
import { readJsonBody } from './body';
import { LOG_PREFIX, type Logger, type RouteHandler } from './deps';
import { optionalValue } from './env';
import { clientIp, hasJsonContentType, isSameOrigin } from './guards';
import type { RateLimiter } from './rate-limit';
import { jsonResponse } from './response';
import { createCheckoutSession } from './stripe-checkout';

export const MAX_CHECKOUT_BODY_BYTES = 1024;

export interface CheckoutDeps {
  fetch: typeof fetch;
  rateLimiter: RateLimiter;
  logger: Logger;
  now: () => number;
}

export function createCheckoutHandler(deps: CheckoutDeps): RouteHandler {
  return async (request, env) => {
    if (!isSameOrigin(request)) return jsonResponse({ ok: false, error: 'forbidden' }, 403);

    const limit = deps.rateLimiter.consume(clientIp(request) ?? 'unknown');
    if (!limit.allowed) {
      return jsonResponse({ ok: false, error: 'rate_limited' }, 429, {
        'Retry-After': String(limit.retryAfterSeconds),
      });
    }

    const secretKey = optionalValue(env.STRIPE_SECRET_KEY);
    if (secretKey === undefined) {
      deps.logger.warn(`${LOG_PREFIX} STRIPE_SECRET_KEY is not set; checkout is unavailable`);
      return jsonResponse({ ok: false, error: 'checkout_unavailable' }, 503);
    }

    if (!hasJsonContentType(request)) return jsonResponse({ ok: false, error: 'validation' }, 400);
    const body = await readJsonBody(request, MAX_CHECKOUT_BODY_BYTES);
    if (body.kind === 'too_large') return jsonResponse({ ok: false, error: 'validation' }, 413);
    if (body.kind === 'invalid') return jsonResponse({ ok: false, error: 'validation' }, 400);

    const parsed = checkoutInputSchema.safeParse(body.value);
    if (!parsed.success) return jsonResponse({ ok: false, error: 'validation' }, 400);

    try {
      const url = await createCheckoutSession({
        secretKey,
        packageId: parsed.data.package,
        email: parsed.data.email,
        origin: new URL(request.url).origin,
        successPath: CHECKOUT_SUCCESS_PATH,
        cancelPath: CHECKOUT_CANCEL_PATH,
        nowMs: deps.now(),
        fetch: deps.fetch,
      });
      return jsonResponse({ ok: true, url }, 200);
    } catch (error) {
      deps.logger.error(
        `${LOG_PREFIX} checkout failed`,
        error instanceof Error ? error.message : 'unknown error',
      );
      return jsonResponse({ ok: false, error: 'checkout_failed' }, 502);
    }
  };
}
