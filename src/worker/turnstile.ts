import { LOG_PREFIX, type Logger } from './deps';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 8000;

interface VerifyOptions {
  token: string;
  secret: string;
  remoteIp: string | null;
  fetch: typeof fetch;
  logger: Pick<Logger, 'error'>;
}

/** Server-side Turnstile check. Any network or protocol failure counts as "not verified". */
export async function verifyTurnstile({
  token,
  secret,
  remoteIp,
  fetch: fetchImpl,
  logger,
}: VerifyOptions): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return typeof result === 'object' && result !== null && 'success' in result
      ? result.success === true
      : false;
  } catch (error) {
    logger.error(
      `${LOG_PREFIX} Turnstile verification request failed`,
      error instanceof Error ? error.name : 'UnknownError',
    );
    return false;
  }
}
