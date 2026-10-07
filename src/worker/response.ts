import type { ContactResponse } from '../lib/contracts/contact';

/** Errors the shared contract does not model; clients treat any `ok: false` as a failure. */
export type TransportError = {
  ok: false;
  error: 'forbidden' | 'not_found' | 'method_not_allowed';
};

export type WorkerResponseBody = ContactResponse | TransportError;

/** JSON response with no-store caching and no CORS headers (same-origin only). */
export function jsonResponse(
  body: WorkerResponseBody,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}
