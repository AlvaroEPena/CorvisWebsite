import { vi, type Mock } from 'vitest';
import { createCheckoutHandler } from '../../../src/worker/checkout-handler';
import { createContactHandler } from '../../../src/worker/contact-handler';
import type { RouteHandler, WorkerContext } from '../../../src/worker/deps';
import type { Env } from '../../../src/worker/env';
import { createRateLimiter, type RateLimiter } from '../../../src/worker/rate-limit';
import { createRouter } from '../../../src/worker/router';
import { createProcessedEvents, createWebhookHandler } from '../../../src/worker/webhook-handler';

export const SITE = 'https://corvis.example';
export const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const RESEND_URL = 'https://api.resend.com/emails';
export const STRIPE_SESSIONS_URL = 'https://api.stripe.com/v1/checkout/sessions';
export const PANDADOC_BASE = 'https://api.pandadoc.com/public/v1';
export const PANDADOC_CREATE_URL = `${PANDADOC_BASE}/documents`;
export const PANDADOC_STATUS_URL = `${PANDADOC_BASE}/documents/doc_1`;
export const PANDADOC_SEND_URL = `${PANDADOC_BASE}/documents/doc_1/send`;
export const WEBHOOK_SECRET = 'whsec_test_secret';

export const LIVE_ENV: Env = {
  RESEND_API_KEY: 're_test_key',
  CONTACT_TO_EMAIL: 'owner@corvis.example',
  CONTACT_FROM_EMAIL: 'Corvis <hello@corvis.example>',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
};

export function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines',
    website: 'https://example.com',
    service: 'redesign',
    budget: '3k-6k',
    message: 'We would like a calm, fast new site.',
    consent: true,
    turnstileToken: 'token-123',
    nickname: '',
    elapsedMs: 8000,
    ...overrides,
  };
}

export interface FetchCall {
  url: string;
  method: string;
  init: RequestInit;
}

type Responder = () => Response | Promise<Response>;

/** Responders keyed by `METHOD url`; defaults answer every integration successfully. */
export type Responders = Partial<Record<string, Responder>>;

export interface FakeNetwork {
  fetch: typeof fetch;
  calls: FetchCall[];
  callsTo(url: string): FetchCall[];
  jsonBodyOf(url: string): Record<string, unknown>;
}

const DEFAULT_RESPONDERS: Record<string, Responder> = {
  [`POST ${TURNSTILE_URL}`]: () => Response.json({ success: true }),
  [`POST ${RESEND_URL}`]: () => Response.json({ id: 'email_1' }),
  [`POST ${STRIPE_SESSIONS_URL}`]: () =>
    Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
  [`POST ${PANDADOC_CREATE_URL}`]: () =>
    Response.json({ id: 'doc_1', status: 'document.uploaded' }, { status: 201 }),
  [`GET ${PANDADOC_STATUS_URL}`]: () => Response.json({ id: 'doc_1', status: 'document.draft' }),
  [`POST ${PANDADOC_SEND_URL}`]: () => Response.json({ id: 'doc_1', status: 'document.sent' }),
};

/** Fake `fetch` that records every request and answers from the responder table. */
export function createFakeNetwork(overrides: Responders = {}): FakeNetwork {
  const calls: FetchCall[] = [];
  const responders = { ...DEFAULT_RESPONDERS, ...overrides };

  const fakeFetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';
    calls.push({ url, method, init });
    const responder = responders[`${method} ${url}`];
    if (!responder) throw new Error(`Unexpected network call: ${method} ${url}`);
    return responder();
  }) as typeof fetch;

  const callsTo = (url: string) => calls.filter((call) => call.url === url);
  return {
    fetch: fakeFetch,
    calls,
    callsTo,
    jsonBodyOf: (url) => JSON.parse(String(callsTo(url)[0]?.init.body)),
  };
}

export interface FakeLogger {
  error: Mock<(...data: unknown[]) => void>;
  warn: Mock<(...data: unknown[]) => void>;
}

export function createFakeLogger(): FakeLogger {
  return { error: vi.fn(), warn: vi.fn() };
}

interface HarnessOptions {
  responders?: Responders;
  rateLimiter?: RateLimiter;
  checkoutRateLimiter?: RateLimiter;
  now?: () => number;
}

/** Wires the real router with fake network, logger, clock and execution context. */
export function createHarness(options: HarnessOptions = {}) {
  const network = createFakeNetwork(options.responders);
  const logger = createFakeLogger();
  const now = options.now ?? (() => Date.now());
  const pending: Promise<unknown>[] = [];
  const ctx: WorkerContext = { waitUntil: (promise) => void pending.push(promise) };
  const sleep = vi.fn(async () => undefined);
  const permissive = () => createRateLimiter({ limit: 1000, windowMs: 60_000 });

  const router: RouteHandler = createRouter({
    contact: createContactHandler({
      fetch: network.fetch,
      rateLimiter: options.rateLimiter ?? permissive(),
      logger,
      sleep,
    }),
    checkout: createCheckoutHandler({
      fetch: network.fetch,
      rateLimiter: options.checkoutRateLimiter ?? permissive(),
      logger,
      now,
    }),
    stripeWebhook: createWebhookHandler({
      fetch: network.fetch,
      logger,
      now,
      processedEvents: createProcessedEvents(),
    }),
  });

  return {
    handler: (request: Request, env: Env) => router(request, env, ctx),
    /** Resolves once every `ctx.waitUntil` task has finished. */
    flush: () => Promise.all(pending),
    network,
    logger,
    sleep,
  };
}

interface PostOptions {
  headers?: Record<string, string>;
  path?: string;
}

/** Builds a JSON POST (or any `body` string) to the Worker. */
export function post(
  body: unknown,
  { headers = {}, path = '/api/contact' }: PostOptions = {},
): Request {
  return new Request(`${SITE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/** Signs a payload the way Stripe does: HMAC-SHA256 over `${t}.${payload}`, hex encoded. */
export async function stripeSignatureHeader(
  payload: string,
  secret: string,
  timestampSeconds: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestampSeconds}.${payload}`),
  );
  const hex = Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `t=${timestampSeconds},v1=${hex}`;
}
