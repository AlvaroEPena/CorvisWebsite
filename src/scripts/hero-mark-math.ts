/** Pure math for the hero mark's pointer reaction, kept apart from the DOM so it is unit tested. */
export interface Tilt {
  /** Degrees around the X axis (positive tips the top away). */
  rotateX: number;
  /** Degrees around the Y axis. */
  rotateY: number;
  /** Parallax shift of the artwork, as a fraction of its box (-1..1 before scaling). */
  shiftX: number;
  shiftY: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/**
 * Maps a pointer position to a tilt. The reference is the mark's own center, normalized by the
 * viewport-sized reach so the whole hero responds, and clamped so the mark never leans far.
 */
export function tiltFromPointer(
  pointer: { x: number; y: number },
  box: Box,
  maxDegrees: number,
  reach: number,
): Tilt {
  const dx = clamp((pointer.x - (box.left + box.width / 2)) / reach, 1);
  const dy = clamp((pointer.y - (box.top + box.height / 2)) / reach, 1);
  return {
    rotateX: -dy * maxDegrees,
    rotateY: dx * maxDegrees,
    shiftX: dx,
    shiftY: dy,
  };
}

/** Moves `current` a fraction of the way to `target`, so the tilt eases instead of snapping. */
export function easeToward(current: number, target: number, factor: number): number {
  const next = current + (target - current) * factor;
  return Math.abs(target - next) < 0.01 ? target : next;
}
