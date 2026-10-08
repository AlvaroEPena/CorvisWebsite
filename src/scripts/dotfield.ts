import {
  cappedPixelRatio,
  edgeFade,
  gridFor,
  isTooSlow,
  pointerInfluence,
  waveHeight,
  type GridSpec,
} from './dotfield-math';

/**
 * Hero dot-field: a grid of dots riding two crossing waves. The phase follows scroll and the dots
 * near the pointer swell. Runs only while the hero is visible and the tab is active, caps DPR, and
 * lowers its own density (then stops) if frames get expensive. Purely decorative (aria-hidden).
 */
const FRAME_INTERVAL_MS = 1000 / 40;
const POINTER_RADIUS = 170;
const COST_SAMPLE_SIZE = 45;
const INDIGO = '59, 59, 214';
const AMBER = '255, 138, 43';

export function startDotField(canvas: HTMLCanvasElement, host: HTMLElement): () => void {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return () => {};

  let width = 0;
  let height = 0;
  let grid: GridSpec = gridFor(1, 1);
  let density = 1;
  let isVisible = false;
  let isRunning = false;
  let frameId = 0;
  let lastFrame = 0;
  const costs: number[] = [];
  /** Listen on the whole hero: the field layer itself ignores pointer events. */
  const pointerHost = host.parentElement ?? host;
  const pointer = { x: -9999, y: -9999, targetX: -9999, targetY: -9999 };

  function resize(): void {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const ratio = cappedPixelRatio(window.devicePixelRatio);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    grid = gridFor(width, height, density);
    draw(performance.now());
  }

  function draw(now: number): void {
    if (!context) return;
    const started = performance.now();
    const time = now / 1000;
    const scroll = window.scrollY;
    pointer.x += (pointer.targetX - pointer.x) * 0.12;
    pointer.y += (pointer.targetY - pointer.y) * 0.12;

    context.clearRect(0, 0, width, height);
    for (let row = 0; row < grid.rows; row++) {
      for (let column = 0; column < grid.columns; column++) {
        const x = column * grid.spacing;
        const y = row * grid.spacing;
        const fade = edgeFade(x, y, width, height);
        if (fade <= 0.02) continue;

        const wave = waveHeight({ x, y, time, scroll });
        const push = pointerInfluence(x - pointer.x, y - pointer.y, POINTER_RADIUS);
        const radius = 1.1 + (wave + 1) * 0.9 + push * 2.6;
        const alpha = (0.1 + (wave + 1) * 0.12 + push * 0.5) * fade;
        context.fillStyle = `rgba(${push > 0.25 ? AMBER : INDIGO}, ${alpha.toFixed(3)})`;
        context.beginPath();
        context.arc(x, y + wave * 6, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    costs.push(performance.now() - started);
    if (costs.length >= COST_SAMPLE_SIZE) {
      if (isTooSlow(costs)) lowerQuality();
      costs.length = 0;
    }
  }

  /** First slow window thins the grid; a second one switches the animation off. */
  function lowerQuality(): void {
    if (density === 1) {
      density = 1.6;
      grid = gridFor(width, height, density);
      return;
    }
    stop();
    host.removeAttribute('data-dotfield-live');
  }

  function loop(now: number): void {
    frameId = requestAnimationFrame(loop);
    if (now - lastFrame < FRAME_INTERVAL_MS) return;
    lastFrame = now;
    draw(now);
  }

  function start(): void {
    if (isRunning || !isVisible || document.hidden) return;
    isRunning = true;
    frameId = requestAnimationFrame(loop);
  }

  function stop(): void {
    isRunning = false;
    cancelAnimationFrame(frameId);
  }

  const onPointerMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointer.targetX = event.clientX - rect.left;
    pointer.targetY = event.clientY - rect.top;
  };
  const onPointerLeave = () => {
    pointer.targetX = pointer.targetY = -9999;
  };
  const onVisibilityChange = () => (document.hidden ? stop() : start());

  const visibility = new IntersectionObserver(([entry]) => {
    isVisible = Boolean(entry?.isIntersecting);
    if (isVisible) start();
    else stop();
  });
  const sizing = new ResizeObserver(resize);

  pointerHost.addEventListener('pointermove', onPointerMove, { passive: true });
  pointerHost.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
  visibility.observe(host);
  sizing.observe(host);
  resize();
  host.setAttribute('data-dotfield-live', '');

  return () => {
    stop();
    visibility.disconnect();
    sizing.disconnect();
    pointerHost.removeEventListener('pointermove', onPointerMove);
    pointerHost.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
