import { readdirSync, readFileSync } from 'node:fs';

import type { Field } from '@sveltia/cms';
import { describe, expect, it } from 'vitest';

import { config } from '../../src/admin/config';
import {
  allReviewFields,
  HOME_MEMBERSHIP_WIDGET,
  homeReviewFields,
  removalMessage,
  REVIEW_KEYS,
  REVIEWS_FOLDER,
} from '../../src/admin/reviews-fields';
import { getAllReviews } from '../../src/lib/reviews';
import { parseHeaderRules } from './helpers/headers';

type Entry = Record<string, unknown>;

const records = readdirSync(REVIEWS_FOLDER).map((name) => {
  const text = readFileSync(`${REVIEWS_FOLDER}/${name}`, 'utf8');
  return { name, text, data: JSON.parse(text) as Entry };
});

interface FolderCollection {
  name: string;
  label: string;
  folder: string;
  format: string;
  extension: string;
  fields: Field[];
  filter?: { field: string; value: unknown };
  reorder?: { key: string };
  delete?: boolean;
}
const collections = (config.collections ?? []) as unknown as FolderCollection[];
const collectionNamed = (name: string) => {
  const found = collections.find((collection) => collection.name === name);
  if (!found) throw new Error(`No collection "${name}"`);
  return found;
};
const namesOf = (fields: Field[]) => fields.map((field) => field.name);

/**
 * What Sveltia writes for one entry: the collection's reorder key first (checked in the real editor,
 * see tests/e2e/admin-reviews.spec.ts), then the other fields in config order, empty optional ones
 * omitted.
 */
function cmsOutput(collection: FolderCollection, entry: Entry): Entry {
  const key = collection.reorder?.key;
  const names = [
    ...(key ? [key] : []),
    ...namesOf(collection.fields).filter((name) => name !== key),
  ];
  const out: Entry = {};
  for (const name of names) {
    const field = collection.fields.find((candidate) => candidate.name === name);
    const value = entry[name];
    const isOptional = field && 'required' in field && field.required === false;
    if (value === undefined || value === null || (isOptional && value === '')) continue;
    out[name] = value;
  }
  return out;
}
const asFile = (entry: Entry) => `${JSON.stringify(entry, null, 2)}\n`;

describe('admin config', () => {
  it('uses the GitHub backend on the Corvis repo, main, without an OAuth proxy', () => {
    expect(config.backend.name).toBe('github');
    expect(config.backend).toMatchObject({ repo: 'AlvaroEPena/CorvisWebsite', branch: 'main' });
    expect(config.backend).not.toHaveProperty('base_url');
    expect(config.load_config_file).toBe(false);
  });

  it('has "All reviews" then "Home reviews", both reading the same folder', () => {
    expect(collections.map((collection) => collection.label)).toEqual([
      'All reviews',
      'Home reviews',
    ]);
    for (const collection of collections) {
      expect(collection).toMatchObject({
        folder: REVIEWS_FOLDER,
        format: 'json',
        extension: 'json',
      });
    }
  });

  it('keeps one record per review: both editors share the fields and differ only where intended', () => {
    const all = collectionNamed('reviews');
    const home = collectionNamed('home-reviews');
    expect(namesOf(home.fields)).toEqual(namesOf(all.fields));
    expect(namesOf(all.fields)).toEqual([
      'name',
      'role',
      'industry',
      'quote',
      'featured',
      'showOnReviewsPage',
      'siteHref',
      'order',
      'homeOrder',
    ]);
    expect(namesOf(all.fields)).toEqual(REVIEW_KEYS);
    // Only `featured` differs: a tick box in All reviews, a confirm-gated button in Home reviews.
    for (const field of all.fields.filter((candidate) => candidate.name !== 'featured')) {
      expect(home.fields.find((candidate) => candidate.name === field.name)).toEqual(field);
    }
  });

  it('shows the home tick box only in All reviews; Home reviews lists the ticked ones', () => {
    const featuredIn = (fields: Field[]) => fields.find((field) => field.name === 'featured');
    expect(featuredIn(allReviewFields)).toMatchObject({
      label: 'Show on the home page',
      widget: 'boolean',
    });
    expect(featuredIn(homeReviewFields)).toMatchObject({
      widget: HOME_MEMBERSHIP_WIDGET,
      default: true,
    });
    expect(collectionNamed('home-reviews').filter).toEqual({ field: 'featured', value: true });
    expect(collectionNamed('reviews').filter).toBeUndefined();
  });

  it('shows "Show on the reviews page" in both editors, as the same field on the same record', () => {
    const find = (fields: Field[]) => fields.find((field) => field.name === 'showOnReviewsPage');
    expect(find(allReviewFields)).toMatchObject({
      label: 'Show on the reviews page',
      widget: 'boolean',
      default: true,
    });
    expect(find(homeReviewFields)).toEqual(find(allReviewFields));
  });

  it('asks before removing a review from the home screen', () => {
    expect(removalMessage('Marisol Okafor')).toBe(
      'Remove Marisol Okafor from the home screen? It stays in All reviews.',
    );
    expect(removalMessage('')).toContain('this review');
  });

  it('drags write a different number in each editor; both numbers are hidden in both', () => {
    expect(collectionNamed('reviews').reorder).toEqual({ key: 'order' });
    expect(collectionNamed('home-reviews').reorder).toEqual({ key: 'homeOrder' });
    for (const fields of [allReviewFields, homeReviewFields]) {
      for (const name of ['order', 'homeOrder']) {
        expect(fields.find((field) => field.name === name)).toMatchObject({
          widget: 'hidden',
          required: false,
        });
      }
    }
  });

  it('cannot delete from Home reviews (that would delete the review everywhere)', () => {
    expect(collectionNamed('home-reviews').delete).toBe(false);
    expect(collectionNamed('reviews').delete).toBeUndefined();
  });

  it('omits empty optional fields so a save never adds empty keys', () => {
    expect(config.output).toMatchObject({ omit_empty_optional_fields: true });
  });
});

describe('round trip through the field definitions', () => {
  it('gives every key in every file a field, so Sveltia accepts the files', () => {
    for (const { name, data } of records) {
      for (const key of Object.keys(data)) expect(REVIEW_KEYS, `${name}: ${key}`).toContain(key);
    }
  });

  it('All reviews writes every file back byte for byte (clean diff)', () => {
    for (const { name, text, data } of records) {
      expect(asFile(cmsOutput(collectionNamed('reviews'), data)), name).toBe(text);
    }
  });

  it('Home reviews writes the same values, losing nothing (only the key order differs)', () => {
    for (const { name, data } of records) {
      expect(cmsOutput(collectionNamed('home-reviews'), data), name).toEqual(data);
    }
  });

  it('every file is a valid review', () => {
    expect(getAllReviews()).toHaveLength(records.length);
  });

  it('drops an emptied siteHref instead of writing an empty string', () => {
    const [first] = records;
    const out = cmsOutput(collectionNamed('reviews'), { ...first?.data, siteHref: '' });
    expect(out).not.toHaveProperty('siteHref');
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
