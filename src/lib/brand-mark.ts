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

export interface MarkGeometry {
  /** Ring arc path and stroke width, in the mark's own 0-100 drawing space. */
  ring: { d: string; width: number };
  chevron: { d: string; width: number };
  /** The amber dot, in the same drawing space. */
  dot: { cx: number; cy: number; r: number };
}

type Matrix = [number, number, number, number, number, number];

const MATRIX_PATTERN = /matrix\(([^)]+)\)/g;

function apply([a, b, c, d, e, f]: Matrix, x: number, y: number): [number, number] {
  return [a * x + c * y + e, b * x + d * y + f];
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Pulls the real geometry out of the mark so larger renderings (the hero) are built from the same
 * numbers as the logo. The ring and chevron sit in an inner group (matrix) inside a flipping outer
 * group; the dot sits directly in the outer group, so it is mapped back into the inner space.
 */
export function markGeometry(body: string): MarkGeometry {
  const matrices = [...body.matchAll(MATRIX_PATTERN)].map(
    (match) => (match[1] ?? '').trim().split(/\s+/).map(Number) as Matrix,
  );
  const outer = matrices[0];
  const inner = matrices[1];
  const ringTag = /<path[^>]*stroke="#3b3bd6"[^>]*>/.exec(body)?.[0];
  const chevronTag = /<path[^>]*stroke="#0e1024"[^>]*>/.exec(body)?.[0];
  const dotTag = /<path[^>]*fill="#ff8a2b"[^>]*>/.exec(body)?.[0];
  if (!outer || !inner || !ringTag || !chevronTag || !dotTag) {
    throw new Error('Mark source does not have the expected ring, chevron and dot');
  }
  const attribute = (tag: string, name: string) =>
    new RegExp(String.raw`\s${name}="([^"]+)"`).exec(tag)?.[1];

  // Dot: bounding circle of its outline, converted from outer-group to inner-group space.
  const numbers = (attribute(dotTag, 'd') ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const xs = numbers.filter((_, index) => index % 2 === 0);
  const ys = numbers.filter((_, index) => index % 2 === 1);
  const centerOuter: [number, number] = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ];
  const screen = apply(outer, ...centerOuter);
  const [a, , , d, e, f] = inner;
  const [outerA, , , outerD, outerE, outerF] = outer;
  // screen = outer(inner(p)); invert both scale-and-translate matrices.
  const innerSpaceX = (screen[0] - outerE) / outerA;
  const innerSpaceY = (screen[1] - outerF) / outerD;
  const cx = (innerSpaceX - e) / a;
  const cy = (innerSpaceY - f) / d;

  return {
    ring: { d: attribute(ringTag, 'd') ?? '', width: Number(attribute(ringTag, 'stroke-width')) },
    chevron: {
      d: attribute(chevronTag, 'd') ?? '',
      width: Number(attribute(chevronTag, 'stroke-width')),
    },
    dot: {
      cx: round(cx),
      cy: round(cy),
      r: round((Math.max(...xs) - Math.min(...xs)) / 2 / Math.abs(a)),
    },
  };
}
