import type { RouteHandler } from './deps';
import { jsonResponse } from './response';

interface Routes {
  contact: RouteHandler;
  checkout: RouteHandler;
  stripeWebhook: RouteHandler;
}

/** Every route is POST-only; this maps path to handler and owns the 404/405 answers. */
export function createRouter(routes: Routes): RouteHandler {
  const handlers: Record<string, RouteHandler> = {
    '/api/contact': routes.contact,
    '/api/checkout': routes.checkout,
    '/api/stripe-webhook': routes.stripeWebhook,
  };

  return async (request, env, ctx) => {
    const { pathname } = new URL(request.url);
    const handler = Object.hasOwn(handlers, pathname) ? handlers[pathname] : undefined;

    if (handler === undefined) return jsonResponse({ ok: false, error: 'not_found' }, 404);
    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    }
    return handler(request, env, ctx);
  };
}
