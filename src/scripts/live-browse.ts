import {
  BROWSE_TUNINGS,
  isTuningName,
  progress,
  scaleFor,
  scrollTopFor,
  type BrowseTuning,
} from './live-browse-math';

/**
 * Shows the REAL demo sites (the same builds as /sandbox) inside the home page's browser mocks.
 *
 * Markup contract (components/LiveSiteStage.astro): a host `[data-live-host]` (also `.browse-host`,
 * so in-view.ts marks it `data-in-view` once fully visible) holding one or two stages
 * `[data-live-stage]` with `data-src` and `data-title`. Each stage already contains its CSS poster.
 *
 *  - Nothing loads until a host is near the viewport, and never under Save-Data or reduced data.
 *  - The demo is probed first (a missing demo keeps the poster). The iframe is decorative: inert,
 *    aria-hidden, not focusable, no pointer events, so the slider on top keeps working.
 *  - The page is a fixed 1440px wide desktop layout, scaled to the stage width with a CSS transform;
 *    it fades in over the poster once loaded (and, for the water hero, once it reports ready).
 *  - The scroll-through drives the iframe's own scroll position from here, so lazy images in the demo
 *    load as they come into view. All stages in a host share one progress value, so the Before and
 *    After pages stay aligned.
 *  - The demo's water hero stops itself when it scrolls out of ITS viewport, not ours, so while a host
 *    is off screen its pages are parked at the bottom (hero out of view = no rendering).
 *  - Phones get the live pages too: measured smooth enough (see docs/progress notes in the report).
 *    The only fallbacks are Save-Data / reduced data (poster only) and reduced motion (live, but no
 *    scrolling, so the pages stay at the top).
 */
const LAYOUT_WIDTH = 1440;
const NEAR_VIEWPORT = '300px 0px';
/** Longest wait for the water hero to report ready before fading the page in anyway. */
const READY_TIMEOUT_MS = 2500;
const READY_POLL_MS = 100;
/** Settling time after load when there is nothing to wait for (images start decoding, fonts apply). */
const READY_GRACE_MS = 300;
const LOAD_TIMEOUT_MS = 12000;
/** Re-measure the demo's height now and then: lazy images change it as they load. */
const MEASURE_EVERY_FRAMES = 30;

const root = document.documentElement;

const wantsPosterOnly = (): boolean =>
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
  readonly element: HTMLElement;
  private readonly src: string;
  private readonly title: string;
  private iframe?: HTMLIFrameElement;
  private ready = false;
  private scrollHeight = 0;
  private viewportHeight = 0;
  private scale = 1;
  private measuredAt = 0;
  /** Where the demo was last scrolled to, so sub-pixel steps can be skipped. */
  private lastTop = Number.NaN;

  constructor(
    element: HTMLElement,
    private readonly onReady: () => void,
  ) {
    this.element = element;
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
    iframe.src = this.src;
    this.element.append(iframe);
    this.element.setAttribute('data-live-state', 'loading');
  }

  /** Scales the 1440px layout to the stage width and gives it the stage's height in layout pixels. */
  private fit(): void {
    const { width, height } = this.element.getBoundingClientRect();
    if (width === 0) return;
    const scale = scaleFor(width, LAYOUT_WIDTH);
    this.element.style.setProperty('--live-scale', String(scale));
    this.element.style.setProperty('--live-height', `${height / scale}px`);
    this.viewportHeight = height / scale;
    this.scale = scale;
  }

  private fail(): void {
    this.iframe?.remove();
    this.iframe = undefined;
    this.element.setAttribute('data-live-state', 'unavailable');
  }

  private async becomeReady(): Promise<void> {
    const doc = this.document();
    if (!doc) return this.fail();
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

  /** Scrolls the demo; `value` is progress (0 to 1) through its scrollable height. */
  scrollToProgress(value: number, frame: number): void {
    const doc = this.document();
    if (!doc || !this.ready) return;
    if (frame - this.measuredAt >= MEASURE_EVERY_FRAMES || this.scrollHeight === 0) {
      this.scrollHeight = doc.documentElement.scrollHeight;
      this.measuredAt = frame;
    }
    const top = scrollTopFor(value, this.scrollHeight, this.viewportHeight);
    // The slow glide moves well under a device pixel per frame: skip updates that cannot be seen,
    // which halves the work on phones (a page this size is scaled to about a quarter).
    const onePixel = 1 / (this.scale * devicePixelRatio);
    if (Math.abs(top - this.lastTop) < onePixel) return;
    this.lastTop = top;
    doc.defaultView?.scrollTo({ top, behavior: 'instant' });
  }

  /** Puts the demo at its very top or very bottom (the hero is only drawn while it is in its viewport). */
  park(edge: 'top' | 'bottom'): void {
    const doc = this.document();
    if (!doc || !this.ready) return;
    this.scrollHeight = doc.documentElement.scrollHeight;
    this.lastTop = edge === 'top' ? 0 : this.scrollHeight;
    doc.defaultView?.scrollTo({ top: this.lastTop, behavior: 'instant' });
  }
}

type Mode = 'top' | 'bottom' | 'running' | 'paused';

class LiveHost {
  private readonly stages: Stage[];
  private mounted = false;
  private isVisible = false;
  private isHovered = false;
  private hasFocus = false;
  /** What the stages currently show; undefined until the first sync (or after a stage becomes ready). */
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

    new MutationObserver(() => this.sync()).observe(this.host, {
      attributes: true,
      attributeFilter: ['data-in-view'],
    });
    this.host.addEventListener('pointerenter', () => this.setHover(true));
    this.host.addEventListener('pointerleave', () => this.setHover(false));
    this.host.addEventListener('focusin', () => this.setFocus(true));
    this.host.addEventListener('focusout', () => this.setFocus(false));
    document.addEventListener('visibilitychange', () => this.sync());
  }

  private setHover(value: boolean): void {
    this.isHovered = value;
    this.sync();
  }

  private setFocus(value: boolean): void {
    this.hasFocus = value;
    this.sync();
  }

  private onStageReady(): void {
    this.host.setAttribute('data-live', '');
    this.mode = undefined;
    this.sync();
  }

  /** Seconds for one pass; read when needed, so the markup (or a test) can change it. */
  private get duration(): number {
    return Number(this.host.dataset.browseDuration) || 26;
  }

  private get tuning(): BrowseTuning {
    const name = this.host.dataset.browseTuning;
    return BROWSE_TUNINGS[isTuningName(name) ? name : 'browse'];
  }

  private get hasLiveStage(): boolean {
    return this.stages.some((stage) => stage.isReady);
  }

  private nextMode(): Mode {
    if (!this.isVisible) return 'bottom';
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inView = this.host.hasAttribute('data-in-view');
    if (reducedMotion || !inView) return 'top';
    return this.isHovered || this.hasFocus || document.hidden ? 'paused' : 'running';
  }

  /** Reconciles what the stages show with visibility, hover, focus and the tab state. */
  private sync(): void {
    if (!this.hasLiveStage) return;
    const next = this.nextMode();
    if (next === this.mode) return;
    this.mode = next;
    cancelAnimationFrame(this.raf);

    if (next === 'running') {
      this.lastTime = performance.now();
      this.raf = requestAnimationFrame(this.tick);
      return;
    }
    if (next === 'paused') return;
    // Leaving the view resets the loop, like the CSS animation it replaces.
    this.elapsed = 0;
    for (const stage of this.stages) stage.park(next);
  }

  private readonly tick = (now: number): void => {
    // Time based, like the CSS animation it replaces: a slow frame skips ahead instead of dragging the loop.
    this.elapsed += (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.frame += 1;
    const value = progress(this.elapsed, this.duration, this.tuning);
    for (const stage of this.stages) stage.scrollToProgress(value, this.frame);
    this.raf = requestAnimationFrame(this.tick);
  };
}

function initLiveSites(): void {
  if (wantsPosterOnly()) return;
  document.querySelectorAll<HTMLElement>('[data-live-host]').forEach((host) => {
    new LiveHost(host).start();
  });
}

initLiveSites();
