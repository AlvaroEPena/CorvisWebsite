import type { ContactResponse, TransportError } from '../lib/contracts/contact';

/** Non-contract failures; clients treat any `ok: false` as a failure. */
export type TransportErrorBody = { ok: false; error: TransportError };

export type WorkerResponseBody = ContactResponse | TransportErrorBody;

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
