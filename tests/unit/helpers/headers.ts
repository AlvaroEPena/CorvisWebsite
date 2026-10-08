/** One block of a Cloudflare `_headers` file. */
export interface HeaderRule {
  pattern: string;
  headers: Map<string, string>;
  /** Names removed with the `! Name` syntax. */
  detached: string[];
}

/** Minimal parser for the `_headers` syntax this site uses: patterns, `Name: value`, `! Name`, `#` comments. */
export function parseHeaderRules(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: new Map(), detached: [] });
      continue;
    }
    const rule = rules.at(-1);
    if (!rule) continue;
    const trimmed = line.trim();
    if (trimmed.startsWith('! ')) {
      rule.detached.push(trimmed.slice(2).trim());
      continue;
    }
    const separator = trimmed.indexOf(':');
    rule.headers.set(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
  }
  return rules;
}
