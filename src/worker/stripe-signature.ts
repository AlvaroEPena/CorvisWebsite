/** Stripe's default tolerance; 0 would disable the recency check, so never use it. */
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

interface VerifyOptions {
  /** The exact raw request body; re-serialised JSON will not verify. */
  payload: string;
  header: string | null;
  secret: string;
  nowMs: number;
}

interface ParsedHeader {
  timestamp: number;
  signatures: string[];
}

/** `t=<unix>,v1=<hex>[,v1=<hex>]`. Only v1 counts; v0 exists for test events and is ignored. */
function parseHeader(header: string): ParsedHeader | undefined {
  let timestamp: number | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === 't' && /^\d{1,12}$/.test(value)) timestamp = Number(value);
    if (key === 'v1') signatures.push(value);
  }
  return timestamp === undefined || signatures.length === 0 ? undefined : { timestamp, signatures };
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | undefined {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return undefined;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Verifies a Stripe webhook signature (https://docs.stripe.com/webhooks#verify-manually):
 * HMAC-SHA256 over `${timestamp}.${rawBody}` keyed by the endpoint secret. `subtle.verify`
 * compares in constant time, and any one matching v1 signature is enough (secret rolling).
 */
export async function verifyStripeSignature({
  payload,
  header,
  secret,
  nowMs,
}: VerifyOptions): Promise<boolean> {
  const parsed = header === null ? undefined : parseHeader(header);
  if (parsed === undefined) return false;
  if (Math.abs(nowMs / 1000 - parsed.timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signedPayload = encoder.encode(`${parsed.timestamp}.${payload}`);

  for (const signature of parsed.signatures) {
    const bytes = hexToBytes(signature);
    if (bytes !== undefined && (await crypto.subtle.verify('HMAC', key, bytes, signedPayload))) {
      return true;
    }
  }
  return false;
}
