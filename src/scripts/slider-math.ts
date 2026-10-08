/** Pure math for the before/after slider. The DOM wiring lives in slider.ts. */

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;
const FALLBACK_PERCENT = 50;

/** Coerces any input value to a whole percentage in 0..100 (NaN falls back to the midpoint). */
export function toPercent(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (Number.isNaN(parsed)) return FALLBACK_PERCENT;
  return Math.round(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, parsed)));
}

/** Width of the "before" window: the left `percent` of the stage. */
export function beforeWidth(percent: number): string {
  return `${toPercent(percent)}%`;
}

/** Screen-reader text for `aria-valuetext`, so the number means something. */
export function describePosition(percent: number): string {
  const before = toPercent(percent);
  if (before === MAX_PERCENT) return 'Showing the original site only';
  if (before === MIN_PERCENT) return 'Showing the Corvis redesign only';
  return `Showing ${before}% original site, ${MAX_PERCENT - before}% Corvis redesign`;
}
