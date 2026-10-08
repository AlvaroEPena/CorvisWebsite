import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Builds the real site twice into a temporary folder (the output of `npm run build` is left alone):
 * once with no verification variables and once with hostile ones, then reads the home page HTML.
 */
const ASTRO = join(process.cwd(), 'node_modules', 'astro', 'bin', 'astro.mjs');

function homeHtml(env: Record<string, string>): string {
  const outDir = mkdtempSync(join(tmpdir(), 'corvis-verification-'));
  try {
    execFileSync(process.execPath, [ASTRO, 'build', '--outDir', outDir], {
      env: {
        ...process.env,
        PUBLIC_GOOGLE_SITE_VERIFICATION: '',
        PUBLIC_BING_SITE_VERIFICATION: '',
        ...env,
      },
      stdio: 'pipe',
    });
    return readFileSync(join(outDir, 'index.html'), 'utf8');
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

describe('search verification tags (build time)', () => {
  it('emits nothing when the variables are unset or empty', () => {
    const html = homeHtml({});
    expect(html).not.toContain('google-site-verification');
    expect(html).not.toContain('msvalidate.01');
  });

  it('emits the tags when set, with the values escaped', () => {
    const html = homeHtml({
      PUBLIC_GOOGLE_SITE_VERIFICATION: 'abc"><script>alert(1)</script>',
      PUBLIC_BING_SITE_VERIFICATION: 'BING123',
    });
    // The quote that would end the attribute early is escaped; `<` and `>` are harmless inside quotes.
    const tag = /<meta name="google-site-verification" content="([^"]*)">/.exec(html);
    expect(tag?.[1]).toBe('abc&quot;><script>alert(1)</script>');
    expect(html).toContain('<meta name="msvalidate.01" content="BING123">');
    // No script element came out of it: the only copy of the text is inside the attribute.
    expect(html.replace(tag?.[0] ?? '', '')).not.toContain('alert(1)');
  });
}, 180_000);
