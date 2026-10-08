import { describe, expect, it } from 'vitest';
import { beforeWidth, describePosition, toPercent } from '../../src/scripts/slider-math';

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

describe('beforeWidth', () => {
  it('is the left share of the stage, clamped', () => {
    expect(beforeWidth(50)).toBe('50%');
    expect(beforeWidth(0)).toBe('0%');
    expect(beforeWidth(100)).toBe('100%');
    expect(beforeWidth(250)).toBe('100%');
  });
});

describe('describePosition', () => {
  it('describes the split for screen readers', () => {
    expect(describePosition(30)).toBe('Showing 30% original site, 70% Corvis redesign');
    expect(describePosition(100)).toBe('Showing the original site only');
    expect(describePosition(0)).toBe('Showing the Corvis redesign only');
  });
});
