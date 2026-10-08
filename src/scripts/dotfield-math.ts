/** Pure math for the hero dot-field wave. The canvas wiring lives in dotfield.ts. */

export interface GridSpec {
  columns: number;
  rows: number;
  /** Distance between dot centres in CSS pixels. */
  spacing: number;
}

const MAX_DEVICE_PIXEL_RATIO = 1.5;
const DESKTOP_SPACING = 26;
const PHONE_SPACING = 30;
const PHONE_MAX_WIDTH = 640;

/** Caps DPR so the backing store stays small on retina phones (the dots are soft shapes anyway). */
export function cappedPixelRatio(devicePixelRatio: number): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio < 1) return 1;
  return Math.min(devicePixelRatio, MAX_DEVICE_PIXEL_RATIO);
}

/** Grid that covers a width x height area. `density` > 1 spreads the dots out (quality fallback). */
export function gridFor(width: number, height: number, density = 1): GridSpec {
  const base = width <= PHONE_MAX_WIDTH ? PHONE_SPACING : DESKTOP_SPACING;
  const spacing = base * Math.max(1, density);
  return {
    spacing,
    columns: Math.max(1, Math.ceil(width / spacing) + 1),
    rows: Math.max(1, Math.ceil(height / spacing) + 1),
  };
}

export interface WaveInput {
  x: number;
  y: number;
  /** Seconds of animation time. */
  time: number;
  /** Scroll offset in pixels; shifts the wave phase so scrolling visibly moves it. */
  scroll: number;
}

/** Wave height in -1..1 from two crossing travelling sine waves. */
export function waveHeight({ x, y, time, scroll }: WaveInput): number {
  const phase = time * 0.9 + scroll * 0.0035;
  const primary = Math.sin(x * 0.011 + phase);
  const cross = Math.sin(y * 0.016 - phase * 0.7 + x * 0.004);
  return primary * 0.65 + cross * 0.35;
}

/** Push (0..1) of the pointer on a dot: strongest at the pointer, gone beyond `radius`. */
export function pointerInfluence(dx: number, dy: number, radius: number): number {
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return 0;
  const falloff = 1 - distance / radius;
  return falloff * falloff;
}

/** Fades dots toward the edges of the field so it blends into the page. 0..1. */
export function edgeFade(x: number, y: number, width: number, height: number): number {
  const horizontal = Math.min(x, width - x) / (width * 0.28);
  const vertical = Math.min(y, height - y) / (height * 0.28);
  return Math.max(0, Math.min(1, horizontal, vertical));
}

/** True when the average frame cost says the device cannot keep up and quality should drop. */
export function isTooSlow(frameCostsMs: readonly number[], budgetMs = 7): boolean {
  if (frameCostsMs.length === 0) return false;
  const average = frameCostsMs.reduce((sum, cost) => sum + cost, 0) / frameCostsMs.length;
  return average > budgetMs;
}
