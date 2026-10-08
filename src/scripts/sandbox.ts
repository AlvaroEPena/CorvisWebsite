import {
  describeSelection,
  formatSandboxHash,
  parseSandboxHash,
  type SandboxVersionKey,
} from '../lib/sandbox-route';
import { FramePool, type FrameSource, type FrameState } from './sandbox-frames';

/**
 * Wires the /sandbox studio. Project data is read from the data attributes the page renders from
 * src/content/sandbox.ts, so nothing is duplicated here. The demo iframes are created only once the
 * browser frame is near the viewport (or the visitor interacts), which keeps the page itself fast.
 */
interface ProjectEntry {
  id: string;
  name: string;
  displayUrl: string;
  tab: HTMLButtonElement;
  versions: Partial<Record<SandboxVersionKey, FrameSource>>;
}

// Demos are whole sites: load them only when the frame is really on screen, never speculatively.
const FRAME_VISIBLE_THRESHOLD = 0.15;

function query<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Sandbox markup is missing ${selector}`);
  return element;
}

function readProject(tab: HTMLButtonElement): ProjectEntry {
  const { projectId = '', name = '', url = '' } = tab.dataset;
  const versions: ProjectEntry['versions'] = {};
  for (const key of ['before', 'after'] as const) {
    const src = tab.dataset[`${key}Src`];
    if (src) versions[key] = { src, title: tab.dataset[`${key}Title`] ?? name };
  }
  return { id: projectId, name, displayUrl: url, tab, versions };
}

function initSandbox(root: HTMLElement): void {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const projects = tabs.map(readProject);
  const versionGroup = query(root, '[data-version-group]');
  const versionButtons = [...versionGroup.querySelectorAll<HTMLButtonElement>('[data-version]')];
  const liveLabel = query(root, '[data-live-label]');
  const deviceButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-device]')];
  const browser = query(root, '[data-browser]');
  const viewport = query(root, '[data-viewport]');
  const sweep = query(root, '[data-sweep]');
  const address = query(root, '[data-address]');
  const status = query(root, '[data-status]');
  const reloadButton = query<HTMLButtonElement>(root, '[data-reload]');
  const fullscreenButton = query<HTMLButtonElement>(root, '[data-fullscreen]');

  const routable = projects.map(({ id, versions }) => ({
    id,
    hasBefore: Boolean(versions.before),
  }));
  let current = parseSandboxHash(window.location.hash, routable);
  let isNearViewport = false;
  let isFirstRender = true;
  let announcement = '';

  const entryOf = (id: string): ProjectEntry => {
    const entry = projects.find((project) => project.id === id) ?? projects[0];
    if (!entry) throw new Error('The sandbox has no projects');
    return entry;
  };
  const keyOf = (id: string, version: SandboxVersionKey) => formatSandboxHash(id, version);
  const sourceOf = (id: string, version: SandboxVersionKey): FrameSource | undefined =>
    entryOf(id).versions[version];

  const reflectActiveState = (state: FrameState) => {
    viewport.dataset.state = state === 'loaded' ? 'ready' : state === 'idle' ? 'loading' : state;
    // Keep the selection in the message: a fast load must not replace "Showing ..." for screen readers.
    if (state === 'loaded') status.textContent = `${announcement} Preview ready.`.trim();
    if (state === 'unavailable') {
      status.textContent = `${announcement} This preview is not available yet.`.trim();
    }
  };

  const pool = new FramePool(viewport, (key, state) => {
    if (key === keyOf(current.projectId, current.version)) reflectActiveState(state);
  });

  const isCurrent = (key: string) => () => key === keyOf(current.projectId, current.version);

  const mountCurrent = () => {
    const key = keyOf(current.projectId, current.version);
    const source = sourceOf(current.projectId, current.version);
    if (source) void pool.mount(key, source, isCurrent(key));
  };

  const render = (announce: boolean) => {
    const entry = entryOf(current.projectId);
    const hasBefore = Boolean(entry.versions.before);
    const key = keyOf(entry.id, current.version);

    for (const project of projects) {
      const isSelected = project.id === entry.id;
      project.tab.setAttribute('aria-selected', String(isSelected));
      project.tab.tabIndex = isSelected ? 0 : -1;
    }
    viewport.setAttribute('aria-labelledby', entry.tab.id);
    address.textContent = entry.displayUrl;
    versionGroup.hidden = !hasBefore;
    liveLabel.hidden = hasBefore;
    for (const button of versionButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.version === current.version));
    }

    pool.show(key);
    reflectActiveState(pool.stateOf(key));
    if (isNearViewport) mountCurrent();

    if (!announce) return;
    announcement = describeSelection(entry.name, current.version, hasBefore);
    status.textContent = announcement;
    if (!isFirstRender) {
      sweep.removeAttribute('data-play');
      void sweep.offsetWidth; // restart the wipe animation
      sweep.setAttribute('data-play', '');
    }
  };

  const select = (projectId: string, version: SandboxVersionKey, writeHash = true) => {
    const next = parseSandboxHash(`#${formatSandboxHash(projectId, version)}`, routable);
    if (next.projectId === current.projectId && next.version === current.version) return;
    current = next;
    isNearViewport = true; // the visitor is interacting, so load now
    render(true);
    if (writeHash) {
      history.replaceState(null, '', `#${formatSandboxHash(current.projectId, current.version)}`);
    }
  };

  // Project picker: click, plus roving focus with the arrow keys, Home and End.
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(entryOf(tab.dataset.projectId ?? '').id, 'after'));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      const target =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? tabs.length - 1
            : step === undefined
              ? undefined
              : (index + step + tabs.length) % tabs.length;
      if (target === undefined) return;
      event.preventDefault();
      const next = tabs[target];
      next?.focus();
      next?.click();
    });
  });

  for (const button of versionButtons) {
    const version = button.dataset.version === 'before' ? 'before' : 'after';
    button.addEventListener('click', () => select(current.projectId, version));
    // Start loading the other version as soon as the visitor reaches for it.
    const warmUp = () => {
      const source = sourceOf(current.projectId, version);
      const key = keyOf(current.projectId, version);
      if (isNearViewport && source) void pool.mount(key, source, isCurrent(key));
    };
    button.addEventListener('pointerenter', warmUp);
    button.addEventListener('focus', warmUp);
  }

  for (const button of deviceButtons) {
    button.addEventListener('click', () => {
      browser.style.width = button.dataset.width ?? '100%';
      for (const other of deviceButtons) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      status.textContent = `${button.textContent?.trim() ?? ''} width.`;
    });
  }

  reloadButton.addEventListener('click', () => {
    const source = sourceOf(current.projectId, current.version);
    if (!source) return;
    isNearViewport = true;
    const key = keyOf(current.projectId, current.version);
    void pool.reload(key, source, isCurrent(key));
  });

  setupFullscreen(browser, fullscreenButton);

  window.addEventListener('hashchange', () => {
    const next = parseSandboxHash(window.location.hash, routable);
    select(next.projectId, next.version, false);
  });

  const stage = query(root, '[data-stage]');
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      isNearViewport = true;
      mountCurrent();
    },
    { threshold: FRAME_VISIBLE_THRESHOLD },
  );
  observer.observe(stage);

  render(false);
  isFirstRender = false;

  // A deep link from another page should land on the frame, not the page heading.
  if (window.location.hash.length > 1) {
    stage.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
}

/** Native Fullscreen API where available; otherwise a fixed, full-window fallback (iOS Safari). */
function setupFullscreen(browser: HTMLElement, button: HTMLButtonElement): void {
  const isActive = () =>
    document.fullscreenElement === browser || browser.hasAttribute('data-expanded');

  const reflect = () => {
    const active = isActive();
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? 'Exit full screen' : 'Open preview full screen');
    document.documentElement.style.overflow = browser.hasAttribute('data-expanded') ? 'hidden' : '';
  };

  const exitFallback = () => {
    browser.removeAttribute('data-expanded');
    reflect();
  };

  button.addEventListener('click', async () => {
    if (isActive()) {
      if (document.fullscreenElement) await document.exitFullscreen();
      exitFallback();
      return;
    }
    if (browser.requestFullscreen) {
      try {
        await browser.requestFullscreen();
        return;
      } catch {
        // Blocked or unsupported for this element: use the fallback below.
      }
    }
    browser.setAttribute('data-expanded', '');
    reflect();
  });

  document.addEventListener('fullscreenchange', reflect);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && browser.hasAttribute('data-expanded')) exitFallback();
  });
}

document.querySelectorAll<HTMLElement>('[data-sandbox]').forEach(initSandbox);
