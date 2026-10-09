// Worker entry. Only wires dependencies; logic lives in the sibling modules.
// Served for /api/* only (wrangler.jsonc `assets.run_worker_first`); static assets handle the rest.
import { createContactHandler } from './contact-handler';
import type { WorkerContext } from './deps';
import type { Env } from './env';
import { createRateLimiter } from './rate-limit';
import { createRouter } from './router';

interface WorkerModule {
  fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response>;
}

const fetchImpl: typeof fetch = (...args) => fetch(...args);
const TEN_MINUTES_MS = 10 * 60 * 1000;

// Rate limits are per isolate and best effort; add a Cloudflare WAF rate-limiting rule for a hard limit.
const handleRequest = createRouter({
  contact: createContactHandler({
    fetch: fetchImpl,
    rateLimiter: createRateLimiter({ limit: 5, windowMs: TEN_MINUTES_MS }),
    logger: console,
  }),
});

const worker: WorkerModule = { fetch: handleRequest };

export default worker;
