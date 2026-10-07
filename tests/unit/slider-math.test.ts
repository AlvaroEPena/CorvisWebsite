import { describe, expect, it } from 'vitest';
import { beforeClipPath, describePosition, toPercent } from '../../src/scripts/slider-math';

describe('toPercent', () => {
  it('rounds and clamps to 0..100', () => {
    expect(toPercent(49.6)).toBe(50);
    expect(toPercent(-20)).toBe(0);
    expect(toPercent(140)).toBe(100);
  });
  it('parses input values and falls back to the midpoint on garbage', () => {
    expect(toPercent('72')).toBe(72);
    expect(toPercent('abc')).toBe(50);
  });
});

describe('beforeClipPath', () => {
  it('clips the right side by the complement of the value', () => {
    expect(beforeClipPath(50)).toBe('inset(0 50% 0 0)');
    expect(beforeClipPath(0)).toBe('inset(0 100% 0 0)');
    expect(beforeClipPath(100)).toBe('inset(0 0% 0 0)');
    expect(beforeClipPath(250)).toBe('inset(0 0% 0 0)');
  });
});

describe('describePosition', () => {
  it('describes the split for screen readers', () => {
    expect(describePosition(30)).toBe('Showing 30% original site, 70% Corvis redesign');
    expect(describePosition(100)).toBe('Showing the original site only');
    expect(describePosition(0)).toBe('Showing the Corvis redesign only');
  });
});
