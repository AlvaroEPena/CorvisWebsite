import { isLit, pinProgress } from './process-pin-math';

/**
 * Desktop only. The Process section is taller than the screen and its content is pinned in the middle
 * (CSS `position: sticky`, so scrolling stays native and fully keyboard and scrollbar friendly). While
 * pinned, the scroll position fills the timeline. Once it is full the extra height is removed for the
 * rest of the page load, so scrolling up and down again never repeats the interaction.
 */
const section = document.querySelector<HTMLElement>('[data-process-pin]');
const pin = section?.querySelector<HTMLElement>('.pin');
const steps = section ? [...section.querySelectorAll<HTMLElement>('.step')] : [];
const desktop = window.matchMedia(
  '(min-width: 64rem) and (hover: hover) and (prefers-reduced-motion: no-preference)',
);

let done = false;
let queued = false;
let idleTimer: number | undefined;
/** The release waits for scrolling to stop, so it can never cut a smooth scroll (nav links) short. */
const IDLE_MS = 160;

function render(progress: number): void {
  if (!section) return;
  section.style.setProperty('--p', progress.toFixed(4));
  steps.forEach((step, index) => {
    step.toggleAttribute('data-lit', isLit(progress, index, steps.length));
  });
}

/** Drops the pinned scroll length and keeps the reader exactly where they are on screen. */
function finish(): void {
  if (!section || !pin || done) return;
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  const extra = section.offsetHeight - pin.offsetHeight;
  // Scrolled back up during the pause: it is not finished after all.
  if (pinProgress(window.scrollY, sectionTop, extra) < 1) return;
  done = true;
  render(1);
  const root = document.documentElement;
  // The browser's own scroll anchoring would also shift the page; this one adjustment is ours.
  root.style.overflowAnchor = 'none';
  section.setAttribute('data-pin-done', '');
  void section.offsetHeight;
  window.scrollTo({ top: Math.max(sectionTop, window.scrollY - extra), behavior: 'instant' });
  requestAnimationFrame(() => {
    root.style.overflowAnchor = '';
  });
}

function update(): void {
  queued = false;
  if (!section || !pin || done) return;
  if (!desktop.matches) {
    render(1);
    return;
  }
  const sectionTop = section.getBoundingClientRect().top + window.scrollY;
  const extra = section.offsetHeight - pin.offsetHeight;
  const progress = pinProgress(window.scrollY, sectionTop, extra);
  render(progress);
  window.clearTimeout(idleTimer);
  if (progress >= 1) idleTimer = window.setTimeout(finish, IDLE_MS);
}

function schedule(): void {
  if (queued) return;
  queued = true;
  requestAnimationFrame(update);
}

if (section && pin) {
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  desktop.addEventListener('change', schedule);
  update();
}
