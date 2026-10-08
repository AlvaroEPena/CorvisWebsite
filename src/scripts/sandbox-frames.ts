/**
 * Keeps one lazily created iframe per project version. Created frames stay mounted (hidden), so
 * switching back is instant and each one keeps its own scroll position and state.
 */
export type FrameState = 'idle' | 'loading' | 'loaded' | 'unavailable';

export interface FrameSource {
  src: string;
  title: string;
}

interface FrameRecord {
  element?: HTMLIFrameElement;
  /** The URL that answered, which may be the `index.html` spelling of the registry path. */
  src?: string;
  state: FrameState;
}

// Scripts and same-origin so the demo behaves like the real site; forms and popups for its links.
const SANDBOX_PERMISSIONS = 'allow-scripts allow-same-origin allow-forms allow-popups';

async function responds(src: string): Promise<boolean> {
  try {
    const response = await fetch(src, { method: 'HEAD', cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The URL a demo is loaded from. A missing demo answers 404 (the site's own error page), which must
 * not be shown in the frame, so the page is probed first. `<dir>/index.html` is probed rather than
 * `<dir>/`: every static host answers it (the Astro preview server does not serve bare directories),
 * it resolves relative URLs exactly like the directory, and Cloudflare simply redirects it to the
 * directory URL. Returns undefined when the demo is absent.
 */
/** The page URL of a demo registry path: `<dir>/` becomes `<dir>/index.html`. */
export const demoPageUrl = (src: string): string => (src.endsWith('/') ? `${src}index.html` : src);

async function resolveAvailable(src: string): Promise<string | undefined> {
  const page = demoPageUrl(src);
  return (await responds(page)) ? page : undefined;
}

export class FramePool {
  private readonly records = new Map<string, FrameRecord>();

  constructor(
    private readonly host: HTMLElement,
    private readonly onStateChange: (key: string, state: FrameState) => void,
  ) {}

  stateOf(key: string): FrameState {
    return this.records.get(key)?.state ?? 'idle';
  }

  /** Marks one frame as the visible one; every other frame is hidden but kept alive. */
  show(activeKey: string): void {
    for (const [key, record] of this.records) {
      record.element?.toggleAttribute('data-active', key === activeKey);
    }
  }

  async mount(key: string, source: FrameSource, isActive: () => boolean): Promise<void> {
    if (this.stateOf(key) !== 'idle') return;
    this.update(key, { state: 'loading' });

    const src = await resolveAvailable(source.src);
    if (!src) {
      this.update(key, { state: 'unavailable' });
      return;
    }

    const element = document.createElement('iframe');
    element.src = src;
    element.title = source.title;
    element.loading = 'lazy';
    element.allow = 'fullscreen';
    element.setAttribute('sandbox', SANDBOX_PERMISSIONS);
    // Evaluated after the availability check: the visitor may have moved on meanwhile.
    element.toggleAttribute('data-active', isActive());
    element.addEventListener('load', () => this.update(key, { state: 'loaded' }));
    this.host.prepend(element);
    this.update(key, { element, src, state: 'loading' });
  }

  /** Reloads a live frame, or retries a demo that was unavailable. */
  async reload(key: string, source: FrameSource, isActive: () => boolean): Promise<void> {
    const record = this.records.get(key);
    if (!record?.element) {
      this.records.delete(key);
      await this.mount(key, source, isActive);
      return;
    }
    this.update(key, { state: 'loading' });
    // Setting src again restarts the page even when the frame has navigated away.
    record.element.src = record.src ?? source.src;
  }

  private update(key: string, patch: Partial<FrameRecord>): void {
    const record: FrameRecord = { state: 'idle', ...this.records.get(key), ...patch };
    this.records.set(key, record);
    this.onStateChange(key, record.state);
  }
}
