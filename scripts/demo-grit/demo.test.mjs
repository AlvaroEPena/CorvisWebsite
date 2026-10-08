import { describe, expect, it } from 'vitest';
import { basePath, forbiddenLeftovers } from './config.mjs';
import { stripSeoHead, transformPage, visibleText } from './html.mjs';
import { findVerbatimRuns, tokenize } from './overlap.mjs';
import { replaceBetween, replaceOnce } from './patch-utils.mjs';
import { imageServiceSource, sourcePatches, sweepText } from './source-patches.mjs';

const isForbidden = (text) =>
  forbiddenLeftovers.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);

describe('findVerbatimRuns', () => {
  const reference =
    'We take pride in offering construction methods that meet strict deadlines every time.';
  it('finds a shared run of 8+ words, ignoring case and punctuation', () => {
    const runs = findVerbatimRuns(
      'Note: we take pride in OFFERING construction methods, that meet strict deadlines.',
      reference,
      8,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe(
      'we take pride in offering construction methods that meet strict deadlines',
    );
  });
  it('ignores runs shorter than the threshold', () => {
    expect(findVerbatimRuns('construction methods that meet strict', reference, 8)).toEqual([]);
  });
  it('tokenizes words only', () => {
    expect(tokenize('Hot-applied, 3/4" cure!')).toEqual(['hot', 'applied', '3', '4', 'cure']);
  });
});

describe('forbidden leftovers', () => {
  it('flags names and claims as whole words only', () => {
    expect(isForbidden('Founded in 1996 by Chad Diamond, ProTech, 20M sq ft')).toEqual(
      expect.arrayContaining(['protech', 'chad', 'diamond', '1996', '20M']),
    );
  });
  it('does not match hashes or longer words', () => {
    expect(isForbidden('index.a1996b.css .x{animation:20ms} chadwick 20Mpx')).toEqual([]);
  });
});

describe('html transforms', () => {
  it('strips social meta and JSON-LD', () => {
    const html =
      '<meta property="og:title" content="x"><meta name="twitter:card" content="y"><script type="application/ld+json">{}</script><meta name="description" content="d">';
    expect(stripSeoHead(html)).toBe('<meta name="description" content="d">');
  });
  it('prefixes paths, adds noindex, drops canonical, opens external links in a new tab', () => {
    const out = transformPage(
      '<head><meta charset="utf-8"><link rel="canonical" href="https://x.test/"></head><a href="/services">s</a><a href="https://unsplash.com/p">u</a>',
      basePath,
    );
    expect(out).toContain(`<a href="${basePath}/services">`);
    expect(out).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(out).not.toContain('canonical');
    expect(out).toContain('target="_blank" rel="noopener noreferrer"');
  });
  it('extracts visible text without scripts and styles', () => {
    expect(
      visibleText('<style>a{}</style><p>Hello &amp; <b>world</b></p><script>x()</script>'),
    ).toBe('Hello & world');
  });
});

describe('source patches', () => {
  it('every patch throws when its target is missing', () => {
    for (const patch of sourcePatches) {
      expect(() => patch.apply('nothing relevant here'), patch.file).toThrow(
        /Patch target not found/,
      );
    }
  });
  it('route patch strips the base from the current path', () => {
    const patch = sourcePatches.find((candidate) => candidate.file.endsWith('url.ts'));
    const source = String.raw`const withoutExt = pathname.replace(/\.html$/, '').replace(/\/index$/, '');`;
    const run = new Function('pathname', `${patch.apply(source)}; return withoutExt;`);
    expect(run(`${basePath}/services.html`)).toBe('/services');
    expect(run(`${basePath}/index.html`)).toBe('');
  });
  it('sweeps wording and counts matches', () => {
    expect(sweepText('Placeholders for the owner preview.')).toEqual({
      text: 'Placeholders for this concept preview.',
      matched: 1,
    });
    expect(sweepText('nothing').matched).toBe(0);
  });
  it('image service defaults to AVIF and caps widths', () => {
    expect(imageServiceSource).toContain("options.format ??= 'avif'");
    expect(imageServiceSource).toContain('MAX_WIDTH = 1600');
  });
  it('replace helpers fail loudly', () => {
    expect(() => replaceOnce('a', 'b', 'c', 'x')).toThrow(/x/);
    expect(() => replaceBetween('a', 'b', 'c', '', 'y')).toThrow(/y/);
    expect(replaceBetween('1[2]3', '[', ']', '-', 'z')).toBe('1-]3');
  });
});
