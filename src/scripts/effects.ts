import { initMagnetic } from './magnetic';

/**
 * Optional visual polish, loaded after first paint by motion.ts. Skipped entirely for
 * reduced-motion (never imported) and Save-Data (checked here).
 */
const root = document.documentElement;

if (!root.hasAttribute('data-save-data')) {
  initMagnetic();

  const host = document.querySelector<HTMLElement>('[data-dotfield]');
  const canvas = host?.querySelector<HTMLCanvasElement>('canvas');
  if (host && canvas) {
    void import('./dotfield').then(({ startDotField }) => startDotField(canvas, host));
  }
}
