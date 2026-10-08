import { describe, expect, it } from 'vitest';

import { easeToward, tiltFromPointer } from '../../src/scripts/hero-mark-math';

const box = { left: 100, top: 100, width: 200, height: 200 };

describe('tiltFromPointer', () => {
  it('is flat when the pointer is over the center', () => {
    const tilt = tiltFromPointer({ x: 200, y: 200 }, box, 10, 500);
    expect(tilt.rotateX).toBeCloseTo(0);
    expect(tilt.rotateY).toBeCloseTo(0);
  });

  it('leans toward the pointer and tips the near edge down', () => {
    const tilt = tiltFromPointer({ x: 450, y: 200 }, box, 10, 500);
    expect(tilt.rotateY).toBeCloseTo(5);
    const below = tiltFromPointer({ x: 200, y: 450 }, box, 10, 500);
    expect(below.rotateX).toBeCloseTo(-5);
  });

  it('never exceeds the maximum', () => {
    const tilt = tiltFromPointer({ x: 99999, y: -99999 }, box, 8, 500);
    expect(tilt.rotateY).toBe(8);
    expect(tilt.rotateX).toBe(8);
    expect(Math.abs(tilt.shiftX)).toBe(1);
  });
});

describe('easeToward', () => {
  it('moves a fraction of the way and settles exactly on the target', () => {
    expect(easeToward(0, 10, 0.5)).toBe(5);
    expect(easeToward(9.995, 10, 0.5)).toBe(10);
  });
});
