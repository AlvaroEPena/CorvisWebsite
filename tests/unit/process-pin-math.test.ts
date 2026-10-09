import { describe, expect, it } from 'vitest';
import { isLit, pinProgress } from '../../src/scripts/process-pin-math';

describe('pinProgress', () => {
  it('is 0 before the pin, climbs through it and stays at 1 after', () => {
    expect(pinProgress(0, 1000, 800)).toBe(0);
    expect(pinProgress(1000, 1000, 800)).toBe(0);
    expect(pinProgress(1400, 1000, 800)).toBe(0.5);
    expect(pinProgress(1800, 1000, 800)).toBe(1);
    expect(pinProgress(5000, 1000, 800)).toBe(1);
  });

  it('is already complete when there is no pinned length', () => {
    expect(pinProgress(0, 1000, 0)).toBe(1);
  });
});

describe('isLit', () => {
  it('lights the first stop at the start and the last one at four fifths', () => {
    expect(isLit(0, 0, 5)).toBe(true);
    expect(isLit(0, 1, 5)).toBe(false);
    expect(isLit(0.2, 1, 5)).toBe(true);
    expect(isLit(0.79, 4, 5)).toBe(false);
    expect(isLit(0.8, 4, 5)).toBe(true);
    expect(isLit(1, 4, 5)).toBe(true);
  });
});
