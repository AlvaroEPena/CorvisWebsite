import { describe, expect, it } from 'vitest';

import { resolveHref } from '../../src/lib/links';

describe('resolveHref', () => {
  it('keeps anchors local on the home page', () => {
    expect(resolveHref('#pricing', true)).toBe('#pricing');
  });
  it('points anchors back to the home page elsewhere', () => {
    expect(resolveHref('#pricing', false)).toBe('/#pricing');
  });
  it('never prefixes root-relative paths', () => {
    expect(resolveHref('/sandbox', true)).toBe('/sandbox');
    expect(resolveHref('/sandbox', false)).toBe('/sandbox');
  });
});
