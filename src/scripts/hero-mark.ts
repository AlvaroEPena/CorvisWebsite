import { easeToward, tiltFromPointer, type Tilt } from './hero-mark-math';

/**
 * Progressive enhancement for the hero mark (components/HeroMark.astro). The mark is fully drawn
 * and animating by CSS alone; this adds two things: pausing the loops while the mark is off screen
 * or the tab is hidden, and a pointer-driven tilt on devices that have a fine pointer.
 * It never runs for reduced motion or Save-Data, and only writes CSS variables (transform-only).
 */
const MAX_TILT_DEGREES = 9;
const EASE_FACTOR = 0.12;
const POINTER_REACH = 700;

const root = document.documentElement;
const isStatic =
  root.hasAttribute('data-save-data') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SWEEP_START_SECONDS = 1.4;

function initHeroMark(mark: HTMLElement): void {
  let isVisible = true;
  const svg = mark.querySelector('svg');
  const syncPause = () => {
    const paused = !isVisible || document.hidden;
    mark.toggleAttribute('data-paused', paused);
    // The light sweep is an SVG (SMIL) animation, which CSS animation-play-state does not control.
    if (paused) svg?.pauseAnimations();
    else svg?.unpauseAnimations();
  };

  // Start the light sweep. It is painted as a gradient on the strokes (vector, crisp), not a masked bar.
  const sweep = mark.querySelector<SVGAnimationElement>('animateTransform[data-sweep]');
  if (sweep) {
    sweep.beginElementAt(SWEEP_START_SECONDS);
    mark.setAttribute('data-sweep', 'on');
  }

  new IntersectionObserver(
    ([entry]) => {
      isVisible = entry?.isIntersecting ?? true;
      syncPause();
    },
    { threshold: 0 },
  ).observe(mark);
  document.addEventListener('visibilitychange', syncPause);

  if (!window.matchMedia('(pointer: fine)').matches) return;

  const current: Tilt = { rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 };
  let target: Tilt = { ...current };
  let frame = 0;

  const paint = () => {
    frame = 0;
    current.rotateX = easeToward(current.rotateX, target.rotateX, EASE_FACTOR);
    current.rotateY = easeToward(current.rotateY, target.rotateY, EASE_FACTOR);
    current.shiftX = easeToward(current.shiftX, target.shiftX, EASE_FACTOR);
    current.shiftY = easeToward(current.shiftY, target.shiftY, EASE_FACTOR);
    mark.style.setProperty('--rx', `${current.rotateX.toFixed(2)}deg`);
    mark.style.setProperty('--ry', `${current.rotateY.toFixed(2)}deg`);
    mark.style.setProperty('--px', current.shiftX.toFixed(3));
    mark.style.setProperty('--py', current.shiftY.toFixed(3));
    const isSettled = (Object.keys(current) as (keyof Tilt)[]).every(
      (key) => current[key] === target[key],
    );
    if (!isSettled) frame = requestAnimationFrame(paint);
  };

  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(paint);
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      if (!isVisible || event.pointerType === 'touch') return;
      target = tiltFromPointer(
        { x: event.clientX, y: event.clientY },
        mark.getBoundingClientRect(),
        MAX_TILT_DEGREES,
        POINTER_REACH,
      );
      schedule();
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => {
    target = { rotateX: 0, rotateY: 0, shiftX: 0, shiftY: 0 };
    schedule();
  });
}

if (!isStatic) document.querySelectorAll<HTMLElement>('[data-hero-mark]').forEach(initHeroMark);
