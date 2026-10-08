export type TextBodyResult = { kind: 'ok'; text: string } | { kind: 'too_large' };

export type JsonBodyResult =
  { kind: 'ok'; value: unknown } | { kind: 'too_large' } | { kind: 'invalid' };

/** Reads the raw body as UTF-8 text, aborting as soon as it exceeds `maxBytes`. */
export async function readBodyText(request: Request, maxBytes: number): Promise<TextBodyResult> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return { kind: 'too_large' };
  if (!request.body) return { kind: 'ok', text: '' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return { kind: 'too_large' };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { kind: 'ok', text: new TextDecoder().decode(bytes) };
}

/** Reads and parses a JSON body with a size cap. An empty body is invalid JSON. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const body = await readBodyText(request, maxBytes);
  if (body.kind === 'too_large') return body;
  try {
    return { kind: 'ok', value: JSON.parse(body.text) };
  } catch {
    return { kind: 'invalid' };
  }
}
