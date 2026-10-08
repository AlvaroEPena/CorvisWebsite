import { describe, expect, it } from 'vitest';
import {
  cappedPixelRatio,
  edgeFade,
  gridFor,
  isTooSlow,
  pointerInfluence,
  waveHeight,
} from '../../src/scripts/dotfield-math';
import { offsetToward } from '../../src/scripts/magnetic';

describe('cappedPixelRatio', () => {
  it('caps retina ratios and ignores bad values', () => {
    expect(cappedPixelRatio(3)).toBe(1.5);
    expect(cappedPixelRatio(1)).toBe(1);
    expect(cappedPixelRatio(0)).toBe(1);
    expect(cappedPixelRatio(Number.NaN)).toBe(1);
  });
});

describe('gridFor', () => {
  it('covers the area and uses wider spacing on phones', () => {
    const desktop = gridFor(1300, 780);
    const phone = gridFor(390, 780);
    expect(desktop.columns * desktop.spacing).toBeGreaterThanOrEqual(1300);
    expect(phone.spacing).toBeGreaterThan(desktop.spacing);
  });
  it('spreads dots out when density rises and never goes below one cell', () => {
    expect(gridFor(1300, 780, 1.6).spacing).toBeGreaterThan(gridFor(1300, 780).spacing);
    expect(gridFor(0, 0).columns).toBeGreaterThanOrEqual(1);
  });
});

describe('waveHeight', () => {
  it('stays within -1..1 and moves with time and scroll', () => {
    for (let x = 0; x < 1400; x += 97) {
      const value = waveHeight({ x, y: x / 2, time: x / 100, scroll: x });
      expect(Math.abs(value)).toBeLessThanOrEqual(1);
    }
    const base = waveHeight({ x: 200, y: 100, time: 0, scroll: 0 });
    expect(waveHeight({ x: 200, y: 100, time: 1, scroll: 0 })).not.toBe(base);
    expect(waveHeight({ x: 200, y: 100, time: 0, scroll: 500 })).not.toBe(base);
  });
});

describe('pointerInfluence / edgeFade', () => {
  it('peaks at the pointer and vanishes beyond the radius', () => {
    expect(pointerInfluence(0, 0, 100)).toBe(1);
    expect(pointerInfluence(60, 0, 100)).toBeGreaterThan(0);
    expect(pointerInfluence(100, 0, 100)).toBe(0);
  });
  it('fades the field toward its edges', () => {
    expect(edgeFade(650, 390, 1300, 780)).toBe(1);
    expect(edgeFade(0, 390, 1300, 780)).toBe(0);
    expect(edgeFade(100, 390, 1300, 780)).toBeGreaterThan(0);
  });
});

describe('isTooSlow', () => {
  it('flags an expensive average only', () => {
    expect(isTooSlow([])).toBe(false);
    expect(isTooSlow([2, 3, 4])).toBe(false);
    expect(isTooSlow([12, 14, 9])).toBe(true);
  });
});

describe('offsetToward', () => {
  it('leans toward the pointer and clamps', () => {
    expect(offsetToward(110, 100)).toBeCloseTo(2.2);
    expect(offsetToward(-500, 100)).toBe(-8);
    expect(offsetToward(900, 100)).toBe(8);
  });
});
