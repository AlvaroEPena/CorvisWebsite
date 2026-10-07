// Contact Worker entry. Only wires dependencies; logic lives in the sibling modules.
// Served for /api/* only (wrangler.jsonc `assets.run_worker_first`); static assets handle the rest.
import type { Env } from './env';
import { createContactHandler } from './handler';
import { createRateLimiter } from './rate-limit';

interface WorkerModule {
  fetch(request: Request, env: Env): Promise<Response>;
}

const handleRequest = createContactHandler({
  fetch: (...args) => fetch(...args),
  // Per-isolate and best effort; add a Cloudflare WAF rate-limiting rule for a hard limit.
  rateLimiter: createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 }),
  logger: console,
});

const worker: WorkerModule = {
  fetch: handleRequest,
};

export default worker;
