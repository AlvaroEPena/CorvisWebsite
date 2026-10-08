import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  classedMark,
  MARK_LIGHT_PALETTE,
  markGeometry,
  MARK_SOURCE_PALETTE,
  paintMark,
  parseMark,
  squareViewBox,
} from '../../src/lib/brand-mark';

const source = readFileSync('src/assets/brand/corvis-mark.svg', 'utf8');

describe('brand mark', () => {
  const { viewBox, body } = parseMark(source);

  it('reads the viewBox and the inner markup from the source file', () => {
    expect(viewBox).toBe('149 115.5 308 380.5');
    expect(body.startsWith('<g')).toBe(true);
    expect(body).not.toContain('<svg');
  });

  it('draws the mark in exactly the source palette', () => {
    for (const color of Object.values(MARK_SOURCE_PALETTE)) expect(body).toContain(color);
  });

  it('repaints every source color for dark surfaces and keeps the amber dot', () => {
    const light = paintMark(body, MARK_LIGHT_PALETTE);
    expect(light).toContain(MARK_LIGHT_PALETTE.ring);
    expect(light).toContain(MARK_LIGHT_PALETTE.chevron);
    expect(light).not.toContain(MARK_SOURCE_PALETTE.ring);
    expect(light).not.toContain(MARK_SOURCE_PALETTE.chevron);
    expect(light).toContain(MARK_SOURCE_PALETTE.dot);
  });

  it('replaces color attributes with classes for stylesheet-driven recoloring', () => {
    const classed = classedMark(body);
    expect(classed).toContain('class="mark-ring"');
    expect(classed).toContain('class="mark-chevron"');
    expect(classed).toContain('class="mark-dot"');
    expect(classed).not.toMatch(/#3b3bd6|#0e1024|#ff8a2b/);
  });

  it('builds a centered square viewBox', () => {
    expect(squareViewBox('0 0 100 200', 10)).toBe('-60 -10 220 220');
  });

  it('rejects input that is not an SVG', () => {
    expect(() => parseMark('<div></div>')).toThrow();
  });
});

describe('markGeometry', () => {
  it('extracts the ring, chevron and dot in the 0-100 drawing space', () => {
    const geometry = markGeometry(parseMark(source).body);
    expect(geometry.ring.width).toBe(11);
    expect(geometry.ring.d.startsWith('M70.93 23.21')).toBe(true);
    expect(geometry.chevron).toEqual({ d: 'M57 33L37 50L57 67', width: 10.6 });
    expect(geometry.dot.cx).toBeCloseTo(64, 1);
    expect(geometry.dot.cy).toBeCloseTo(50, 1);
    expect(geometry.dot.r).toBeCloseTo(6.5, 1);
  });
});
