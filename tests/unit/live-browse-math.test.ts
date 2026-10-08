import { describe, expect, it } from 'vitest';

import {
  BROWSE_TUNINGS,
  cubicBezier,
  forwardPass,
  isTuningName,
  progress,
  scaleFor,
  scrollTopFor,
} from '../../src/scripts/live-browse-math';

describe('cubicBezier', () => {
  it('matches the CSS easings at the ends and is monotonic', () => {
    const easeIn = cubicBezier(0.42, 0, 1, 1);
    expect(easeIn(0)).toBe(0);
    expect(easeIn(1)).toBe(1);
    expect(easeIn(0.5)).toBeLessThan(0.5);
    const easeOut = cubicBezier(0, 0, 0.58, 1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
    let previous = -1;
    for (let x = 0; x <= 1; x += 0.05) {
      const y = easeIn(x);
      expect(y).toBeGreaterThanOrEqual(previous);
      previous = y;
    }
  });
  it('is linear for a linear curve', () => {
    expect(cubicBezier(0, 0, 1, 1)(0.3)).toBeCloseTo(0.3, 5);
  });
});

describe('tunings match the CSS keyframes', () => {
  // motion.css: browse = hold 4%, ramp to 12%, steady to 88%, ramp to 96%, hold; ramp distance 0.0476.
  it('browse', () => {
    expect(BROWSE_TUNINGS.browse).toEqual({ hold: 0.04, ramp: 0.08, rampDistance: 0.0476 });
    const pass = (u: number) => forwardPass(u, BROWSE_TUNINGS.browse);
    expect(pass(0)).toBe(0);
    expect(pass(0.04)).toBe(0);
    expect(pass(0.12)).toBeCloseTo(0.0476, 6);
    expect(pass(0.5)).toBeCloseTo(0.5, 6);
    expect(pass(0.88)).toBeCloseTo(0.9524, 6);
    expect(pass(0.96)).toBe(1);
    expect(pass(1)).toBe(1);
  });
  // motion.css: browse-slow = hold 1.5%, ramp to 4.5%, steady to 95.5%, ramp to 98.5%; distance 0.016.
  it('browse-slow', () => {
    expect(BROWSE_TUNINGS['browse-slow']).toEqual({ hold: 0.015, ramp: 0.03, rampDistance: 0.016 });
    const pass = (u: number) => forwardPass(u, BROWSE_TUNINGS['browse-slow']);
    expect(pass(0.015)).toBe(0);
    expect(pass(0.045)).toBeCloseTo(0.016, 6);
    expect(pass(0.955)).toBeCloseTo(0.984, 6);
    expect(pass(0.985)).toBe(1);
  });
  it('rises monotonically through the pass', () => {
    for (const tuning of Object.values(BROWSE_TUNINGS)) {
      let previous = 0;
      for (let u = 0; u <= 1; u += 0.005) {
        const value = forwardPass(u, tuning);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  });
});

describe('progress', () => {
  const tuning = BROWSE_TUNINGS.browse;
  it('holds at the start, then moves', () => {
    expect(progress(0, 26, tuning)).toBe(0);
    expect(progress(1, 26, tuning)).toBe(0); // inside the 4% hold (1.04 s)
    expect(progress(5, 26, tuning)).toBeGreaterThan(0);
  });
  it('alternates direction on every pass and holds at the far end', () => {
    expect(progress(26 * 0.5, 26, tuning)).toBeCloseTo(0.5, 6);
    expect(progress(26 * 0.98, 26, tuning)).toBe(1);
    expect(progress(26 * 1.02, 26, tuning)).toBe(1); // start of the way back: still holding
    expect(progress(26 * 1.5, 26, tuning)).toBeCloseTo(0.5, 6);
    expect(progress(26 * 1.98, 26, tuning)).toBe(0);
    expect(progress(26 * 2.5, 26, tuning)).toBeCloseTo(0.5, 6);
  });
  it('the way back mirrors the way down', () => {
    for (const u of [0.1, 0.2, 0.7, 0.9]) {
      expect(progress(26 * (1 + u), 26, tuning)).toBeCloseTo(1 - progress(26 * u, 26, tuning), 9);
    }
  });
  it('holds about a second at each end of the 26 s loop', () => {
    expect(26 * tuning.hold).toBeCloseTo(1.04, 2);
  });
  it('is safe for bad input', () => {
    expect(progress(-3, 26, tuning)).toBe(0);
    expect(progress(5, 0, tuning)).toBe(0);
    expect(progress(Number.NaN, 26, tuning)).toBe(0);
  });
});

describe('helpers', () => {
  it('scrolls a fraction of the scrollable distance', () => {
    expect(scrollTopFor(0.5, 4000, 900)).toBe(1550);
    expect(scrollTopFor(1, 4000, 900)).toBe(3100);
    expect(scrollTopFor(0.7, 500, 900)).toBe(0);
  });
  it('scales the layout width into the container', () => {
    expect(scaleFor(720, 1440)).toBe(0.5);
  });
  it('recognises tuning names', () => {
    expect(isTuningName('browse')).toBe(true);
    expect(isTuningName('browse-slow')).toBe(true);
    expect(isTuningName('x')).toBe(false);
    expect(isTuningName(undefined)).toBe(false);
  });
});
