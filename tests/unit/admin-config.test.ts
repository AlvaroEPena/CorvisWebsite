import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { config } from '../../src/admin/config';
import { REVIEWS_FILE, reviewFields, reviewsFileFields } from '../../src/admin/reviews-fields';
import { reviewSchema } from '../../src/lib/reviews';
import { parseHeaderRules } from './helpers/headers';

const fileText = readFileSync(REVIEWS_FILE, 'utf8');
const fileData = JSON.parse(fileText) as { reviews: Record<string, unknown>[] };

/** What Sveltia writes for one entry: fields in config order, empty optional ones omitted. */
function cmsOutput(entry: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of reviewFields) {
    const value = entry[field.name];
    const isOptional = 'required' in field && field.required === false;
    if (value === undefined || value === null || (isOptional && value === '')) continue;
    out[field.name] = value;
  }
  return out;
}

describe('admin config', () => {
  it('uses the GitHub backend on the Corvis repo, main, without an OAuth proxy', () => {
    expect(config.backend.name).toBe('github');
    expect(config.backend).toMatchObject({ repo: 'AlvaroEPena/CorvisWebsite', branch: 'main' });
    expect(config.backend).not.toHaveProperty('base_url');
    expect(config.load_config_file).toBe(false);
  });

  it('has one Reviews file collection editing reviews.json', () => {
    expect(config.collections).toHaveLength(1);
    const [collection] = config.collections ?? [];
    expect(collection).toMatchObject({ name: 'reviews', label: 'Reviews' });
    const files = (collection as { files: { file: string; fields: unknown[] }[] }).files;
    expect(files).toHaveLength(1);
    expect(files[0]?.file).toBe('src/content/reviews.json');
    expect(files[0]?.fields).toBe(reviewsFileFields);
  });

  it('edits a sortable list named "reviews" with the agreed fields', () => {
    const [list] = reviewsFileFields;
    expect(list).toMatchObject({ name: 'reviews', widget: 'list' });
    expect(reviewFields.map((field) => field.name)).toEqual([
      'id',
      'name',
      'role',
      'company',
      'quote',
      'featured',
      'siteHref',
    ]);
    const byName = Object.fromEntries(reviewFields.map((field) => [field.name, field]));
    expect(byName.featured).toMatchObject({ label: 'Show on the home page', widget: 'boolean' });
    expect(byName.siteHref).toMatchObject({ required: false });
    expect(byName.id).toMatchObject({ widget: 'uuid', prefix: 'review-' });
  });

  it('omits empty optional fields so a save never adds empty keys', () => {
    expect(config.output).toMatchObject({ omit_empty_optional_fields: true });
  });
});

describe('round trip through the field definitions', () => {
  it('gives every key in the file a field, so Sveltia accepts the file', () => {
    const fieldNames = new Set(reviewFields.map((field) => field.name));
    for (const entry of fileData.reviews) {
      for (const key of Object.keys(entry)) expect(fieldNames.has(key), key).toBe(true);
    }
  });

  it('writes the current file back byte for byte (clean diff, no key changes)', () => {
    const output = { reviews: fileData.reviews.map(cmsOutput) };
    expect(`${JSON.stringify(output, null, 2)}\n`).toBe(fileText);
  });

  it('writes valid reviews for every entry', () => {
    for (const entry of fileData.reviews) {
      expect(reviewSchema.safeParse(cmsOutput(entry)).success).toBe(true);
    }
  });

  it('drops an emptied siteHref instead of writing an empty string', () => {
    expect(cmsOutput({ ...fileData.reviews[0], siteHref: '' })).not.toHaveProperty('siteHref');
  });
});

describe('public/_headers for /admin*', () => {
  const rules = parseHeaderRules(readFileSync('public/_headers', 'utf8'));
  const admin = rules.find((rule) => rule.pattern === '/admin*');
  const csp = admin?.headers.get('Content-Security-Policy') ?? '';

  it('detaches the site CSP before setting the editor CSP', () => {
    expect(admin?.detached).toContain('Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://api.github.com');
    expect(csp).toContain('worker-src');
    expect(csp).toContain('blob:');
    expect(csp).toContain('https://avatars.githubusercontent.com');
    expect(csp).toContain('https://raw.githubusercontent.com');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('never allows inline or eval scripts in the editor', () => {
    const scriptSrc = csp.split(';').find((part) => part.trim().startsWith('script-src'));
    expect(scriptSrc?.trim()).toBe("script-src 'self'");
  });

  it('is never framed, indexed or cached', () => {
    expect(admin?.detached).toContain('X-Frame-Options');
    expect(admin?.headers.get('X-Frame-Options')).toBe('DENY');
    expect(admin?.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(admin?.headers.get('Cache-Control')).toBe('no-store');
  });

  it('keeps editor hosts out of the public CSP', () => {
    const publicCsp = rules
      .find((rule) => rule.pattern === '/*')
      ?.headers.get('Content-Security-Policy');
    expect(publicCsp).not.toMatch(/github|blob:/);
  });

  it('stays within Cloudflare limits', () => {
    const lines = readFileSync('public/_headers', 'utf8').split('\n');
    expect(rules.length).toBeLessThanOrEqual(100);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(2000);
  });
});
