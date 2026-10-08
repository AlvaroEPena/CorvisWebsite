/**
 * Pure math for the live "scroll-through" of the real demo sites on the home page.
 *
 * The motion is defined in TIME, not as shares of the loop, so a long loop never sits still at the
 * ends: a short hold, an eased start, a steady glide, an eased stop and a short hold, then the
 * direction flips. The ease is a cubic (position grows with the cube of time), and the steady speed is
 * worked out so the speed is continuous where the ease meets the glide.
 */
export interface BrowseTiming {
  /** Seconds held still at each end. */
  holdSeconds: number;
  /** Seconds easing in at the start of a pass, and easing out at its end. */
  rampSeconds: number;
}

export const BROWSE_TIMING: BrowseTiming = { holdSeconds: 0.3, rampSeconds: 1 };

/** Shortest pass the timing fits in: both holds, both ramps and a moment of glide. */
export const minimumPassSeconds = ({ holdSeconds, rampSeconds }: BrowseTiming): number =>
  2 * holdSeconds + 2 * rampSeconds + 0.1;

/**
 * Position (0 to 1) `seconds` into one forward pass of `duration` seconds.
 *
 * Ease-in covers `v * ramp / 3` of the distance (a cubic: speed reaches the glide speed `v` exactly
 * at the end of the ramp); the glide covers `v * glideSeconds`; ease-out mirrors ease-in.
 */
export function forwardPass(seconds: number, duration: number, timing: BrowseTiming): number {
  const hold = timing.holdSeconds;
  const ramp = Math.min(timing.rampSeconds, Math.max(0, (duration - 2 * hold) / 2.2));
  const glide = duration - 2 * hold - 2 * ramp;
  const speed = 1 / (glide + (2 * ramp) / 3);
  const rampDistance = (speed * ramp) / 3;

  if (seconds <= hold) return 0;
  const afterHold = seconds - hold;
  if (afterHold < ramp) return rampDistance * (afterHold / ramp) ** 3;
  const afterRamp = afterHold - ramp;
  if (afterRamp <= glide) return rampDistance + speed * afterRamp;
  const intoOut = afterRamp - glide;
  if (intoOut < ramp) return 1 - rampDistance * ((ramp - intoOut) / ramp) ** 3;
  return 1;
}

/**
 * How far through the page the scroll-through is, `seconds` after it started, for passes of
 * `durationSeconds`. Even passes go down, odd passes come back up. Add `timing.holdSeconds` to
 * `seconds` to start moving at once instead of holding first.
 */
export function progress(
  seconds: number,
  durationSeconds: number,
  timing: BrowseTiming = BROWSE_TIMING,
): number {
  if (!(durationSeconds > 0) || !(seconds > 0)) return 0;
  const pass = Math.floor(seconds / durationSeconds);
  const shape = forwardPass(seconds - pass * durationSeconds, durationSeconds, timing);
  return pass % 2 === 0 ? shape : 1 - shape;
}

/** The scroll offset for a progress value; a page shorter than its window does not scroll. */
export function scrollTopFor(value: number, scrollHeight: number, viewportHeight: number): number {
  return Math.max(0, scrollHeight - viewportHeight) * value;
}

/**
 * Splits a scroll offset into the whole pixels the document is scrolled to and the leftover
 * fraction, which is drawn as a tiny transform so the motion stays smooth even though a document
 * can only scroll in whole pixels.
 */
export function splitScroll(top: number): { whole: number; fraction: number } {
  const whole = Math.floor(top);
  return { whole, fraction: top - whole };
}

/** Horizontal scale that fits the fixed desktop layout width into a container. */
export const scaleFor = (containerWidth: number, layoutWidth: number): number =>
  containerWidth / layoutWidth;
