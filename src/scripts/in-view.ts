/**
 * Marks elements with `data-in-view` while they should be animating. CSS only runs the long-lived
 * decorative animations (browser-mock scroll-through, water drift) while the mark is present, so
 * off-screen work costs nothing.
 *
 * With `fullyVisible`, the mark is set only once (nearly) the whole element is on screen, so a
 * scroll-through begins when the visitor can actually see it, and is cleared only once it has
 * mostly left (the gap avoids restarting the animation when it is nudged at the edge of the screen).
 */
interface Options {
  fullyVisible?: boolean;
}

const START_RATIO = 0.9;
/** Height the sticky top bar covers, so a frame that fills the rest of a short window still counts as fully visible. */
const TOP_BAR_ALLOWANCE = 96;
const STOP_RATIO = 0.15;
const THRESHOLDS = Array.from({ length: 21 }, (_, step) => step / 20);

/** Share of the element that is visible, relative to the most of it that could fit on screen. */
function visibleShare(entry: IntersectionObserverEntry): number {
  const viewportHeight = (entry.rootBounds?.height ?? window.innerHeight) - TOP_BAR_ALLOWANCE;
  const possible = Math.min(entry.boundingClientRect.height, viewportHeight);
  return possible > 0 ? entry.intersectionRect.height / possible : 0;
}

export function observeInView(selector: string, { fullyVisible = false }: Options = {}): void {
  const hosts = document.querySelectorAll<HTMLElement>(selector);
  if (hosts.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!fullyVisible) {
          entry.target.toggleAttribute('data-in-view', entry.isIntersecting);
          continue;
        }
        const share = entry.isIntersecting ? visibleShare(entry) : 0;
        if (share >= START_RATIO) entry.target.setAttribute('data-in-view', '');
        else if (share < STOP_RATIO) entry.target.removeAttribute('data-in-view');
      }
    },
    fullyVisible ? { threshold: THRESHOLDS } : { rootMargin: '120px 0px' },
  );
  hosts.forEach((host) => observer.observe(host));
}
