import { BROWSE_TIMING, progress, scaleFor, scrollTopFor, splitScroll } from './live-browse-math';

/**
 * Shows the REAL demo sites (the same builds as /sandbox) inside the home page's browser frames.
 *
 * Markup contract (components/LiveSiteStage.astro): a host `[data-live-host]` (also marked
 * `data-in-view` by in-view.ts once fully visible) holding one or two stages `[data-live-stage]` with
 * `data-src` and `data-title`. Each stage already holds the "Preview Loading" placeholder, in its final
 * box, from the first paint.
 *
 *  - Nothing loads until a host is near the viewport, and never under Save-Data or reduced data.
 *  - The demo is probed first (a missing demo leaves the calm "Preview unavailable" placeholder). The
 *    iframe is decorative: inert, aria-hidden, not focusable, no pointer events, so the slider on top
 *    keeps working. It is mounted hidden in the same box and only ever changes opacity: it cross-fades
 *    in over the placeholder once the page (and, for the water hero, the water) is ready.
 *  - The page is a fixed 1440px wide desktop layout scaled to the stage width with a CSS transform.
 *  - The scroll-through drives the iframe's own scroll position, so lazy images in the demo load as
 *    they come into view and the demo's own scroll effects run. Browsers scroll documents in whole
 *    pixels, which at a slow glide makes the motion step unevenly; the leftover fraction of a pixel is
 *    drawn as a tiny transform instead, so the picture moves smoothly. Both stages in a host share one
 *    progress value, so Before and After stay aligned.
 *  - It does NOT pause on hover or focus. It pauses only when the tab is hidden, and the water hero is
 *    paused (by message, ?preview=1 mode of the demo) while the host is off screen.
 *  - Phones get the live pages too: measured smooth with a real GPU. The only fallbacks are Save-Data and
 *    reduced data (placeholder only) and reduced motion (live, but no scrolling).
 */
const LAYOUT_WIDTH = 1440;
const NEAR_VIEWPORT = '300px 0px';
/** Longest wait for the water hero to report ready before fading the page in anyway. */
const READY_TIMEOUT_MS = 2500;
const READY_POLL_MS = 100;
/** Settling time after load: images start decoding, fonts apply. */
const READY_GRACE_MS = 300;
const LOAD_TIMEOUT_MS = 12000;
/** Re-measure the demo's height now and then: lazy images change it as they load. */
const MEASURE_EVERY_FRAMES = 30;
/** Extra layout pixels so the sub-pixel shift never shows a gap at the bottom edge. */
const BLEED = 2;
const PREVIEW_QUERY = '?preview=1';
const HIDE_SCROLLBAR = 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}';

const root = document.documentElement;

const wantsPlaceholderOnly = (): boolean =>
  root.hasAttribute('data-save-data') || matchMedia('(prefers-reduced-data: reduce)').matches;

async function responds(src: string): Promise<boolean> {
  try {
    const response = await fetch(src, { method: 'HEAD', cache: 'no-store' });
    // Reading the (normally empty) body lets the request finish cleanly on servers that send one.
    await response.text();
    return response.ok;
  } catch {
    return false;
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Resolves when the demo's water hero (if it has one) is drawing, or after READY_TIMEOUT_MS. */
async function whenWaterReady(doc: Document): Promise<void> {
  const water = doc.querySelector('[data-water-root]');
  if (!water) {
    await delay(READY_GRACE_MS);
    return;
  }
  for (let waited = 0; waited < READY_TIMEOUT_MS; waited += READY_POLL_MS) {
    const tier = water.getAttribute('data-water-tier');
    if (water.hasAttribute('data-water-ready') || tier === 'off') break;
    await delay(READY_POLL_MS);
  }
  await delay(READY_GRACE_MS);
}

class Stage {
  private readonly src: string;
  private readonly title: string;
  private iframe?: HTMLIFrameElement;
  private ready = false;
  private scrollHeight = 0;
  private viewportHeight = 0;
  private scale = 1;
  private measuredAt = 0;
  private lastWhole = Number.NaN;
  private lastFraction = Number.NaN;

  constructor(
    private readonly element: HTMLElement,
    private readonly onReady: () => void,
  ) {
    this.src = element.dataset.src ?? '';
    this.title = element.dataset.title ?? '';
  }

  get isReady(): boolean {
    return this.ready;
  }

  async mount(): Promise<void> {
    if (!this.src || !(await responds(this.src))) {
      this.element.setAttribute('data-live-state', 'unavailable');
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.className = 'live-frame';
    iframe.title = this.title;
    iframe.tabIndex = -1;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('inert', '');
    iframe.setAttribute('loading', 'eager');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    this.iframe = iframe;
    this.fit();
    new ResizeObserver(() => this.fit()).observe(this.element);

    const failTimer = window.setTimeout(() => this.fail(), LOAD_TIMEOUT_MS);
    iframe.addEventListener(
      'load',
      () => {
        window.clearTimeout(failTimer);
        void this.becomeReady();
      },
      { once: true },
    );
    // ?preview=1 asks the demo for its lighter preview mode (cheaper water, pausable by message).
    iframe.src = `${this.src}${PREVIEW_QUERY}`;
    this.element.append(iframe);
  }

  /** Sizes the 1440px layout to the stage: the scale, and the height that fills the box. */
  private fit(): void {
    const { width, height } = this.element.getBoundingClientRect();
    if (width === 0 || !this.iframe) return;
    this.scale = scaleFor(width, LAYOUT_WIDTH);
    this.viewportHeight = height / this.scale;
    this.iframe.style.setProperty('--live-height', `${this.viewportHeight + BLEED}px`);
    this.lastFraction = Number.NaN; // redraw the transform with the new scale
    this.draw(Number.isNaN(this.lastWhole) ? 0 : this.lastWhole, 0);
  }

  private fail(): void {
    this.iframe?.remove();
    this.iframe = undefined;
    this.element.setAttribute('data-live-state', 'unavailable');
  }

  private async becomeReady(): Promise<void> {
    const doc = this.document();
    if (!doc) return this.fail();
    const style = doc.createElement('style');
    style.textContent = HIDE_SCROLLBAR;
    doc.head.append(style);
    await whenWaterReady(doc);
    this.ready = true;
    this.element.setAttribute('data-live-state', 'ready');
    this.element.setAttribute('data-live-ready', '');
    this.onReady();
  }

  private document(): Document | undefined {
    try {
      return this.iframe?.contentDocument ?? undefined;
    } catch {
      return undefined;
    }
  }

  /** Scrolls to `whole` pixels and draws the `fraction` of a pixel left over as a transform. */
  private draw(whole: number, fraction: number): void {
    const iframe = this.iframe;
    if (!iframe) return;
    if (whole !== this.lastWhole) {
      this.lastWhole = whole;
      iframe.contentWindow?.scrollTo({ top: whole, behavior: 'instant' });
    }
    if (fraction !== this.lastFraction) {
      this.lastFraction = fraction;
      iframe.style.transform = `translate3d(0, ${-fraction * this.scale}px, 0) scale(${this.scale})`;
    }
  }

  /** `value` is progress (0 to 1) through the demo's scrollable height. */
  scrollToProgress(value: number, frame: number): void {
    const doc = this.document();
    if (!doc || !this.ready) return;
    if (frame - this.measuredAt >= MEASURE_EVERY_FRAMES || this.scrollHeight === 0) {
      this.scrollHeight = doc.documentElement.scrollHeight;
      this.measuredAt = frame;
    }
    const { whole, fraction } = splitScroll(
      scrollTopFor(value, this.scrollHeight, this.viewportHeight),
    );
    this.draw(whole, fraction);
  }

  /** Back to the very top, with no leftover fraction. */
  reset(): void {
    if (this.ready) this.draw(0, 0);
  }

  /** Tells the demo whether it is on screen, so it can stop its water and other heavy work. */
  setPaused(paused: boolean): void {
    try {
      this.iframe?.contentWindow?.postMessage({ type: 'corvis-preview', paused }, location.origin);
    } catch {
      // The demo is gone; nothing to pause.
    }
  }
}

/** What the stages are doing: still (at the top), moving, or paused with the tab hidden. */
type Mode = 'off' | 'still' | 'running' | 'paused';

class LiveHost {
  private readonly stages: Stage[];
  private mounted = false;
  private isVisible = false;
  private mode: Mode | undefined;
  private elapsed = 0;
  private lastTime = 0;
  private frame = 0;
  private raf = 0;

  constructor(private readonly host: HTMLElement) {
    this.stages = [...host.querySelectorAll<HTMLElement>('[data-live-stage]')].map(
      (element) => new Stage(element, () => this.onStageReady()),
    );
  }

  start(): void {
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || this.mounted) return;
        this.mounted = true;
        near.disconnect();
        void Promise.all(this.stages.map((stage) => stage.mount()));
      },
      { rootMargin: NEAR_VIEWPORT },
    );
    near.observe(this.host);

    new IntersectionObserver((entries) => {
      this.isVisible = entries.some((entry) => entry.isIntersecting);
      this.sync();
    }).observe(this.host);

    // in-view.ts sets this once the whole frame is on screen: that is when the scroll-through starts.
    new MutationObserver(() => this.sync()).observe(this.host, {
      attributes: true,
      attributeFilter: ['data-in-view'],
    });
    document.addEventListener('visibilitychange', () => this.sync());
  }

  /** Seconds a duration of one pass lasts; read when needed, so the markup (or a test) can change it. */
  private get duration(): number {
    return Number(this.host.dataset.browseDuration) || 26;
  }

  private onStageReady(): void {
    this.host.setAttribute('data-live', '');
    this.mode = undefined;
    this.sync();
  }

  private get hasLiveStage(): boolean {
    return this.stages.some((stage) => stage.isReady);
  }

  private nextMode(): Mode {
    if (!this.isVisible) return 'off';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Once the whole frame has been seen it keeps going until the frame has left the screen.
    const hasStarted = this.mode === 'running' || this.mode === 'paused';
    const shouldRun = this.host.hasAttribute('data-in-view') || (hasStarted && this.isVisible);
    if (reducedMotion || !shouldRun) return 'still';
    return document.hidden ? 'paused' : 'running';
  }

  /** Reconciles what the stages show with visibility and the tab state. */
  private sync(): void {
    if (!this.hasLiveStage) return;
    const next = this.nextMode();
    if (next === this.mode) return;
    this.mode = next;
    cancelAnimationFrame(this.raf);

    // The demo only works (water, scroll effects) while it can be seen.
    const demoPaused = next === 'off' || next === 'paused';
    for (const stage of this.stages) stage.setPaused(demoPaused);

    if (next === 'running') {
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    if (next === 'paused') return;
    // Off screen or not started: rest at the top, out of sight or exactly where it began.
    this.elapsed = 0;
    for (const stage of this.stages) stage.reset();
  }

  private readonly tick = (now: number): void => {
    // Time based, like a CSS animation: a slow frame skips ahead instead of dragging the loop.
    this.elapsed += (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.frame += 1;
    // The first hold is skipped: the scroll-through starts moving as soon as the frame is in view.
    const value = progress(this.elapsed + BROWSE_TIMING.holdSeconds, this.duration, BROWSE_TIMING);
    for (const stage of this.stages) stage.scrollToProgress(value, this.frame);
    this.raf = requestAnimationFrame(this.tick);
  };
}

function initLiveSites(): void {
  if (wantsPlaceholderOnly()) {
    // Calm, honest state: no demo is loaded for Save-Data visitors.
    document
      .querySelectorAll<HTMLElement>('[data-live-stage]')
      .forEach((stage) => stage.setAttribute('data-live-state', 'unavailable'));
    return;
  }
  document.querySelectorAll<HTMLElement>('[data-live-host]').forEach((host) => {
    new LiveHost(host).start();
  });
}

initLiveSites();
