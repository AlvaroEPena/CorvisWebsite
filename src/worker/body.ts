export type JsonBodyResult =
  { kind: 'ok'; value: unknown } | { kind: 'too_large' } | { kind: 'invalid' };

/** Reads and parses a JSON body, aborting as soon as it exceeds `maxBytes`. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return { kind: 'too_large' };

  if (!request.body) return { kind: 'invalid' };

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

  try {
    return { kind: 'ok', value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { kind: 'invalid' };
  }
}
