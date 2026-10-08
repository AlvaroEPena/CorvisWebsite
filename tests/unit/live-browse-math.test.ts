import { describe, expect, it } from 'vitest';

import {
  BROWSE_TIMING,
  forwardPass,
  minimumPassSeconds,
  progress,
  scaleFor,
  scrollTopFor,
  splitScroll,
} from '../../src/scripts/live-browse-math';

const { holdSeconds, rampSeconds } = BROWSE_TIMING;

describe('timing', () => {
  it('holds 0.3 s at each end and eases for 1 s', () => {
    expect(BROWSE_TIMING).toEqual({ holdSeconds: 0.3, rampSeconds: 1 });
  });
});

describe('forwardPass', () => {
  for (const duration of [26, 80]) {
    describe(`a ${duration} s pass`, () => {
      const at = (seconds: number) => forwardPass(seconds, duration, BROWSE_TIMING);

      it('holds still for 0.3 s at both ends', () => {
        expect(at(0)).toBe(0);
        expect(at(holdSeconds)).toBe(0);
        expect(at(duration - holdSeconds)).toBe(1);
        expect(at(duration)).toBe(1);
        expect(at(holdSeconds + 0.05)).toBeGreaterThan(0);
        expect(at(duration - holdSeconds - 0.05)).toBeLessThan(1);
      });

      it('rises monotonically from 0 to 1 and joins up with no jumps', () => {
        let previous = 0;
        for (let seconds = 0; seconds <= duration; seconds += 0.01) {
          const value = at(seconds);
          expect(value).toBeGreaterThanOrEqual(previous - 1e-12);
          // No step larger than the glide speed allows (plus a little for the ease).
          expect(value - previous).toBeLessThan(0.01 * (2 / duration) + 1e-9);
          previous = value;
        }
      });

      it('eases in over 1 s: slow at first, then reaching the glide speed', () => {
        const start = holdSeconds;
        const early = at(start + 0.1) - at(start);
        const late = at(start + rampSeconds) - at(start + rampSeconds - 0.1);
        expect(late).toBeGreaterThan(early * 10);
        // Cubic ease: a tenth of the way in covers a thousandth of the ramp distance.
        const rampDistance = at(start + rampSeconds);
        expect(at(start + rampSeconds / 10) / rampDistance).toBeCloseTo(0.001, 6);
      });

      it('glides at one steady speed between the ramps', () => {
        const glideStart = holdSeconds + rampSeconds;
        const glideEnd = duration - holdSeconds - rampSeconds;
        const speed = (at(glideStart + 1) - at(glideStart)) / 1;
        for (const seconds of [glideStart + 2, (glideStart + glideEnd) / 2, glideEnd - 2]) {
          expect(at(seconds + 0.5) - at(seconds)).toBeCloseTo(speed * 0.5, 9);
        }
        // The speed at the end of the ease-in equals the glide speed (no jolt).
        const justBefore = (at(glideStart) - at(glideStart - 0.001)) / 0.001;
        expect(justBefore).toBeCloseTo(speed, 2);
      });

      it('is symmetric: the end mirrors the start', () => {
        for (const seconds of [0.2, 0.5, 1, 1.3, duration / 3]) {
          expect(at(duration - seconds)).toBeCloseTo(1 - at(seconds), 9);
        }
      });
    });
  }

  it('has no long stall: even an 80 s loop moves within 0.4 s of the start', () => {
    expect(forwardPass(0.7, 80, BROWSE_TIMING)).toBeGreaterThan(0);
  });

  it('copes with a pass barely longer than the holds and ramps', () => {
    const duration = minimumPassSeconds(BROWSE_TIMING);
    expect(forwardPass(duration / 2, duration, BROWSE_TIMING)).toBeGreaterThan(0.3);
    expect(forwardPass(duration, duration, BROWSE_TIMING)).toBe(1);
    expect(forwardPass(1, 1, BROWSE_TIMING)).toBe(1); // shorter than the holds: just done
  });
});

describe('progress', () => {
  const duration = 26;
  it('starts at zero and is safe for bad input', () => {
    expect(progress(0, duration)).toBe(0);
    expect(progress(-3, duration)).toBe(0);
    expect(progress(5, 0)).toBe(0);
    expect(progress(Number.NaN, duration)).toBe(0);
  });
  it('alternates direction on every pass', () => {
    expect(progress(duration * 0.5, duration)).toBeCloseTo(0.5, 6);
    expect(progress(duration * 1, duration)).toBe(1);
    expect(progress(duration * 1.5, duration)).toBeCloseTo(0.5, 6);
    expect(progress(duration * 2, duration)).toBe(0);
    expect(progress(duration * 2.5, duration)).toBeCloseTo(0.5, 6);
  });
  it('the way back mirrors the way down', () => {
    for (const seconds of [0.5, 1.2, 5, 20, 25.5]) {
      expect(progress(duration + seconds, duration)).toBeCloseTo(
        1 - progress(seconds, duration),
        9,
      );
    }
  });
  it('turns around within 0.6 s: it holds 0.3 s at the end, then eases away', () => {
    const turn = duration - holdSeconds; // reaches the end here, then the next pass holds 0.3 s
    expect(progress(turn, duration)).toBe(1);
    expect(progress(duration + holdSeconds, duration)).toBe(1);
    expect(progress(duration + holdSeconds + 0.3, duration)).toBeLessThan(1);
  });
  it('starting with the first hold skipped begins moving at once', () => {
    expect(progress(0 + holdSeconds + 0.05, duration)).toBeGreaterThan(0);
  });
});

describe('helpers', () => {
  it('scrolls a fraction of the scrollable distance', () => {
    expect(scrollTopFor(0.5, 4000, 900)).toBe(1550);
    expect(scrollTopFor(1, 4000, 900)).toBe(3100);
    expect(scrollTopFor(0.7, 500, 900)).toBe(0);
  });
  it('splits an offset into whole pixels and a fraction', () => {
    expect(splitScroll(12.25)).toEqual({ whole: 12, fraction: 0.25 });
    expect(splitScroll(7)).toEqual({ whole: 7, fraction: 0 });
    const { whole, fraction } = splitScroll(1550.7);
    expect(whole + fraction).toBeCloseTo(1550.7, 9);
  });
  it('scales the layout width into the container', () => {
    expect(scaleFor(720, 1440)).toBe(0.5);
  });
});
