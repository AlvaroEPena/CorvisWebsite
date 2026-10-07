import { vi, type Mock } from 'vitest';
import { createContactHandler, type RequestHandler } from '../../../src/worker/handler';
import type { Env } from '../../../src/worker/env';
import { createRateLimiter, type RateLimiter } from '../../../src/worker/rate-limit';

export const SITE = 'https://corvis.example';
export const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const RESEND_URL = 'https://api.resend.com/emails';

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
  init: RequestInit;
}

export interface FakeNetwork {
  fetch: typeof fetch;
  calls: FetchCall[];
  callsTo(url: string): FetchCall[];
}

interface NetworkOptions {
  turnstile?: () => Response | Promise<Response>;
  resend?: () => Response | Promise<Response>;
}

/** Fake `fetch` that answers Turnstile and Resend calls and records every request. */
export function createFakeNetwork(options: NetworkOptions = {}): FakeNetwork {
  const calls: FetchCall[] = [];
  const turnstile = options.turnstile ?? (() => Response.json({ success: true }));
  const resend = options.resend ?? (() => Response.json({ id: 'email_1' }));

  const fakeFetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === TURNSTILE_URL) return turnstile();
    if (url === RESEND_URL) return resend();
    throw new Error(`Unexpected network call to ${url}`);
  }) as typeof fetch;

  return { fetch: fakeFetch, calls, callsTo: (url) => calls.filter((call) => call.url === url) };
}

export interface FakeLogger {
  error: Mock<(...data: unknown[]) => void>;
  warn: Mock<(...data: unknown[]) => void>;
}

export function createFakeLogger(): FakeLogger {
  return { error: vi.fn(), warn: vi.fn() };
}

interface HarnessOptions extends NetworkOptions {
  rateLimiter?: RateLimiter;
}

export function createHarness(options: HarnessOptions = {}) {
  const network = createFakeNetwork(options);
  const logger = createFakeLogger();
  const handler: RequestHandler = createContactHandler({
    fetch: network.fetch,
    rateLimiter: options.rateLimiter ?? createRateLimiter({ limit: 1000, windowMs: 60_000 }),
    logger,
  });
  return { handler, network, logger };
}

interface PostOptions {
  headers?: Record<string, string>;
  path?: string;
}

/** Builds a JSON POST (or any `body` string) to the contact endpoint. */
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
