/** Browsers send Origin on cross-site POSTs; a mismatch means another site is posting to us. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (origin === null) return true; // non-browser clients send no Origin
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string | null {
  return request.headers.get('CF-Connecting-IP');
}

export function hasJsonContentType(request: Request): boolean {
  return Boolean(request.headers.get('Content-Type')?.toLowerCase().includes('application/json'));
}
