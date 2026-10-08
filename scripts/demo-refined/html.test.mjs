import { describe, expect, it } from 'vitest';
import { applyNoindex, markExternalLinks, prefixCssUrls, prefixRootPaths } from './html.mjs';

const base = '/demos/refined-celebrations';

describe('prefixRootPaths', () => {
  it('prefixes root-absolute links and the home link', () => {
    expect(prefixRootPaths('<a href="/events">x</a><a href="/">h</a>', base)).toBe(
      `<a href="${base}/events">x</a><a href="${base}/">h</a>`,
    );
  });
  it('leaves already prefixed, protocol-relative and external URLs alone', () => {
    const html = `<img src="${base}/_astro/a.avif"><a href="//x.test/a"></a><a href="https://x.test/">`;
    expect(prefixRootPaths(html, base)).toBe(html);
  });
  it('prefixes unprefixed srcset candidates only', () => {
    expect(prefixRootPaths('<img srcset="/a.webp 1x, /b.webp 2x">', base)).toBe(
      `<img srcset="${base}/a.webp 1x, ${base}/b.webp 2x">`,
    );
  });
});

describe('prefixCssUrls', () => {
  it('prefixes root urls and keeps data/relative ones', () => {
    expect(prefixCssUrls('a{background:url(/x.png)}b{background:url(data:x)}', base)).toBe(
      `a{background:url(${base}/x.png)}b{background:url(data:x)}`,
    );
  });
});

describe('markExternalLinks', () => {
  it('opens external links in a new tab and replaces existing target/rel', () => {
    const out = markExternalLinks('<a href="https://x.test" target="_self" rel="me">x</a>');
    expect(out).toBe('<a href="https://x.test" target="_blank" rel="noopener noreferrer">x</a>');
  });
  it('ignores internal links', () => {
    expect(markExternalLinks('<a href="/events">x</a>')).toBe('<a href="/events">x</a>');
  });
});

describe('applyNoindex', () => {
  it('adds one robots meta and removes canonical', () => {
    const out = applyNoindex(
      '<head><meta charset="utf-8"><meta name="robots" content="noindex"><link rel="canonical" href="https://x.test/"></head>',
    );
    expect(out).toBe(
      '<head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"></head>',
    );
  });
});
