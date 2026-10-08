/**
 * Magnetic buttons: while a fine pointer hovers a `[data-magnetic]` element it leans a few pixels
 * toward the cursor, then springs back. Uses the independent `translate` property (compositor
 * only) so it never shifts layout and never fights the hover/press `transform`.
 */
const PULL = 0.22;
const MAX_OFFSET = 8;

const clamp = (value: number) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, value));

export function offsetToward(pointer: number, center: number): number {
  return clamp((pointer - center) * PULL);
}

function attach(element: HTMLElement): void {
  element.addEventListener(
    'pointermove',
    (event) => {
      const rect = element.getBoundingClientRect();
      const x = offsetToward(event.clientX, rect.left + rect.width / 2);
      const y = offsetToward(event.clientY, rect.top + rect.height / 2);
      element.style.setProperty('--mx', `${x}px`);
      element.style.setProperty('--my', `${y}px`);
    },
    { passive: true },
  );
  element.addEventListener(
    'pointerleave',
    () => {
      element.style.setProperty('--mx', '0px');
      element.style.setProperty('--my', '0px');
    },
    { passive: true },
  );
}

export function initMagnetic(root: ParentNode = document): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(attach);
}
