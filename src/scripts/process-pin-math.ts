/** Pure maths for the desktop Process timeline, so it can be unit tested without a browser. */

/**
 * How far through the pinned scroll we are, from 0 (the timeline has just reached the middle of the
 * screen) to 1 (it has filled up and the page is free to move on).
 */
export function pinProgress(scrollY: number, sectionTop: number, extra: number): number {
  if (extra <= 0) return 1;
  return Math.min(1, Math.max(0, (scrollY - sectionTop) / extra));
}

/** A stop is lit once the thread has reached it. With `count` stops, stop `index` sits at `index / count`. */
export function isLit(progress: number, index: number, count: number): boolean {
  return count > 0 && progress >= index / count - 1e-9;
}
