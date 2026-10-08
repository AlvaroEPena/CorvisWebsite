/**
 * Pure math for the live "scroll-through" of the real demo sites on the home page. It reproduces the
 * CSS `browse` / `browse-slow` keyframes (src/styles/motion.css) so a live site is read at the same
 * pace as the poster mock: a short hold at each end, an eased start and finish, a steady glide in
 * between, and the direction alternating on every pass.
 */
export interface BrowseTuning {
  /** Share of one pass spent holding still at each end. */
  hold: number;
  /** Share of one pass spent easing in (and out). */
  ramp: number;
  /** Share of the distance covered while easing in (and, mirrored, out). */
  rampDistance: number;
}

/** The numbers behind the two CSS keyframes. */
export const BROWSE_TUNINGS = {
  browse: { hold: 0.04, ramp: 0.08, rampDistance: 0.0476 },
  'browse-slow': { hold: 0.015, ramp: 0.03, rampDistance: 0.016 },
} as const satisfies Record<string, BrowseTuning>;

export type TuningName = keyof typeof BROWSE_TUNINGS;

export const isTuningName = (value: string | undefined): value is TuningName =>
  value !== undefined && value in BROWSE_TUNINGS;

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of time (x) returning progress (y). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const coordinate = (a: number, b: number, t: number) =>
    3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let low = 0;
    let high = 1;
    let t = x;
    for (let step = 0; step < 32; step += 1) {
      const current = coordinate(x1, x2, t);
      if (Math.abs(current - x) < 1e-7) break;
      if (current < x) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return coordinate(y1, y2, t);
  };
}

const easeIn = cubicBezier(0.42, 0, 1, 1);
const easeOut = cubicBezier(0, 0, 0.58, 1);

/** Position (0 to 1) within one forward pass, `u` being the share of the pass elapsed. */
export function forwardPass(u: number, { hold, ramp, rampDistance }: BrowseTuning): number {
  const rampEnd = hold + ramp;
  const outStart = 1 - hold - ramp;
  if (u <= hold) return 0;
  if (u < rampEnd) return rampDistance * easeIn((u - hold) / ramp);
  if (u <= outStart) {
    return rampDistance + ((u - rampEnd) / (outStart - rampEnd)) * (1 - 2 * rampDistance);
  }
  if (u < 1 - hold) return 1 - rampDistance + rampDistance * easeOut((u - outStart) / ramp);
  return 1;
}

/**
 * How far through the page the scroll-through is, `seconds` after it started, for passes of
 * `durationSeconds`. Even passes go down, odd passes come back up (CSS `alternate`).
 */
export function progress(seconds: number, durationSeconds: number, tuning: BrowseTuning): number {
  if (!(durationSeconds > 0) || !(seconds > 0)) return 0;
  const passes = seconds / durationSeconds;
  const pass = Math.floor(passes);
  const shape = forwardPass(passes - pass, tuning);
  return pass % 2 === 0 ? shape : 1 - shape;
}

/** The scroll offset for a progress value; a page shorter than its window does not scroll. */
export function scrollTopFor(value: number, scrollHeight: number, viewportHeight: number): number {
  return Math.max(0, scrollHeight - viewportHeight) * value;
}

/** Horizontal scale that fits the fixed desktop layout width into a container. */
export const scaleFor = (containerWidth: number, layoutWidth: number): number =>
  containerWidth / layoutWidth;
