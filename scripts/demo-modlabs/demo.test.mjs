import { describe, expect, it } from 'vitest';
import { extractPickedIds, selectPhotos, summarizeTrim } from './gallery-trim.mjs';
import { applyNoindex, rewriteContactLinks, stripSeoHead, transformPage } from './html.mjs';
import { sourcePatches } from './source-patches.mjs';

const base = '/demos/mod-labs';

describe('stripSeoHead', () => {
  it('removes social meta, JSON-LD, manifest and sitemap links but keeps the rest', () => {
    const html =
      '<meta property="og:title" content="x"><meta name="twitter:card" content="y">' +
      '<link rel="manifest" href="/m"><link rel="sitemap" href="/s">' +
      '<script type="application/ld+json">{"a":1}</script><meta name="description" content="d">';
    expect(stripSeoHead(html)).toBe('<meta name="description" content="d">');
  });
});

describe('rewriteContactLinks', () => {
  it('points /contact links at /quote, keeping query and hash', () => {
    expect(
      rewriteContactLinks(
        '<a href="/contact">a</a><a href="/contact/#x">b</a><a href="/contact?z=1">c</a>',
      ),
    ).toBe('<a href="/quote">a</a><a href="/quote#x">b</a><a href="/quote?z=1">c</a>');
  });
  it('leaves similarly named paths alone', () => {
    expect(rewriteContactLinks('<a href="/contacts">a</a>')).toBe('<a href="/contacts">a</a>');
  });
});

describe('transformPage', () => {
  it('chains the transforms: contact link ends up under the base, noindex is added', () => {
    const out = transformPage(
      '<head><meta charset="utf-8"><link rel="canonical" href="https://x.test/"></head><a href="/contact">c</a>',
      base,
    );
    expect(out).toContain(`<a href="${base}/quote">c</a>`);
    expect(out).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(out).not.toContain('canonical');
    expect(applyNoindex(out)).toBe(out);
  });
});

describe('gallery selection', () => {
  const records = [
    ...[1, 2, 3, 4].map((id) => ({ id, project: 'a' })),
    ...[5, 6].map((id) => ({ id, project: 'b' })),
  ];
  it('keeps the first N per project and any pinned id, in original order', () => {
    const kept = selectPhotos(records, { photosPerProject: 2, pinnedIds: new Set([4]) });
    expect(kept.map((record) => record.id)).toEqual([1, 2, 4, 5, 6]);
  });
  it('summarizes kept versus total per project', () => {
    const kept = selectPhotos(records, { photosPerProject: 1, pinnedIds: new Set() });
    expect(summarizeTrim(records, kept)).toEqual([
      { project: 'a', total: 4, kept: 1 },
      { project: 'b', total: 2, kept: 1 },
    ]);
  });
  it('reads picked ids from picks.ts source', () => {
    expect([
      ...extractPickedIds('{ id: 340, project: "gwii" }, { id: 52, category: "x" }'),
    ]).toEqual([340, 52]);
  });
});

describe('source patches', () => {
  it('every patch throws when its target is missing', () => {
    for (const patch of sourcePatches.filter(
      (candidate) => candidate.file !== 'src/data/videos.json',
    )) {
      expect(() => patch.apply('nothing relevant here'), patch.file).toThrow(
        /Patch target not found/,
      );
    }
  });
  it('nav patch strips the base from the current path', () => {
    const nav = sourcePatches.find((patch) => patch.file.endsWith('nav.ts'));
    const source = 'const p = pathname.replace(/\\.html$/, "").replace(/\\/$/, "") || "/";';
    const patched = nav.apply(source);
    const isCurrent = new Function('pathname', `${patched}; return p;`);
    expect(isCurrent(`${base}/gallery/switch`)).toBe('/gallery/switch');
    expect(isCurrent(`${base}/`)).toBe('/');
  });
});
