// Shared by the brand asset scripts: loads the owner's mark and renders it as standalone SVG.
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

import {
  classedMark,
  MARK_PALETTES,
  paintMark,
  parseMark,
  squareViewBox,
} from '../src/lib/brand-mark.ts';

const sourcePath = new URL('../src/assets/brand/corvis-mark.svg', import.meta.url);
const mark = parseMark(await readFile(sourcePath, 'utf8'));

/** The mark alone, painted for a surface, in a square canvas with even padding. */
export function squareMarkSvg({ variant = 'default', padding = 40 } = {}) {
  const body = paintMark(mark.body, MARK_PALETTES[variant]);
  const viewBox = squareViewBox(mark.viewBox, padding);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
}

/** The mark as a nested <svg> to place inside a larger composition. */
export function placedMark({ x, y, height, variant = 'default' }) {
  const [, , width, markHeight] = mark.viewBox.split(/\s+/).map(Number);
  const scaledWidth = (width / markHeight) * height;
  const body = paintMark(mark.body, MARK_PALETTES[variant]);
  return `<svg x="${x}" y="${y}" width="${scaledWidth}" height="${height}" viewBox="${mark.viewBox}">${body}</svg>`;
}

/** Class-driven mark for the favicon, where a stylesheet swaps colors for dark tab bars. */
export function classedBody() {
  return { viewBox: mark.viewBox, body: classedMark(mark.body) };
}
