/**
 * The Corvis mark (src/assets/brand/corvis-mark.svg) is vector-only and drawn in three palette
 * colors. This module reads that single source file and repaints it per surface, so the nav, the
 * footer, the favicon set and the social image can never drift apart. Pure functions, no I/O.
 */

export interface MarkPalette {
  /** The C-shaped ring. */
  ring: string;
  /** The chevron inside the C. */
  chevron: string;
  /** The amber dot. */
  dot: string;
}

/** Colors used in the source file; also the default palette on light surfaces. */
export const MARK_SOURCE_PALETTE: MarkPalette = {
  ring: '#3b3bd6',
  chevron: '#0e1024',
  dot: '#ff8a2b',
};

/** Dark surfaces: the chevron turns near-white and the ring lightens so both stay legible. */
export const MARK_LIGHT_PALETTE: MarkPalette = {
  ring: '#7c7cff',
  chevron: '#f8f7ff',
  dot: '#ff8a2b',
};

export type MarkVariant = 'default' | 'light';

export const MARK_PALETTES: Record<MarkVariant, MarkPalette> = {
  default: MARK_SOURCE_PALETTE,
  light: MARK_LIGHT_PALETTE,
};

export interface MarkParts {
  viewBox: string;
  /** Inner SVG markup, without the outer <svg> element. */
  body: string;
}

const SVG_PATTERN = /<svg[^>]*\sviewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/;

export function parseMark(source: string): MarkParts {
  const match = SVG_PATTERN.exec(source);
  if (!match?.[1] || match[2] === undefined) throw new Error('Mark source is not a valid SVG');
  return { viewBox: match[1], body: match[2].trim() };
}

/** Square viewBox centered on the mark with even padding, for icons that need a 1:1 canvas. */
export function squareViewBox(viewBox: string, padding: number): string {
  const [x = 0, y = 0, width = 0, height = 0] = viewBox.split(/\s+/).map(Number);
  const side = Math.max(width, height) + padding * 2;
  return [x + width / 2 - side / 2, y + height / 2 - side / 2, side, side]
    .map((value) => Number(value.toFixed(2)))
    .join(' ');
}

/** Repaints the source colors with another palette. */
export function paintMark(body: string, palette: MarkPalette): string {
  return body
    .replaceAll(MARK_SOURCE_PALETTE.ring, palette.ring)
    .replaceAll(MARK_SOURCE_PALETTE.chevron, palette.chevron)
    .replaceAll(MARK_SOURCE_PALETTE.dot, palette.dot);
}

/**
 * Swaps the color attributes for class names (`mark-ring`, `mark-chevron`, `mark-dot`), so a
 * stylesheet can recolor the mark, for example with `prefers-color-scheme` inside a favicon.
 */
export function classedMark(body: string): string {
  return body
    .replace(`stroke="${MARK_SOURCE_PALETTE.ring}"`, 'class="mark-ring"')
    .replace(`stroke="${MARK_SOURCE_PALETTE.chevron}"`, 'class="mark-chevron"')
    .replace(`fill="${MARK_SOURCE_PALETTE.dot}"`, 'class="mark-dot"');
}
