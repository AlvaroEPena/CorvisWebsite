import { expect, type Locator, type Page, test } from '@playwright/test';

import { axeViolations, revealEverything } from './support';

/**
 * The home page shows the REAL demo builds (the same ones as /sandbox) in the before/after slider and
 * the Work previews. Each frame holds a "Preview Loading" placeholder in its final box from the first
 * paint, and the live site cross-fades in over it. See scripts/live-browse.ts.
 */
const AFTER = '/demos/saltwater-row/index.html';
const BEFORE = '/demos/saltwater-row-before/index.html';
const REFINED = '/demos/refined-celebrations/index.html';
const MOD_LABS = '/demos/mod-labs/index.html';

const slider = (page: Page) => page.getByTestId('redesign-slider');
const frames = (page: Page) => page.locator('[data-ba] iframe');
const WORK_HOSTS = '#work [data-live-host]';

/** Centres an element so the whole of it is on screen (a scroll-through starts once it is). */
const centre = (page: Page, selector: string, index = 0) =>
  page
    .locator(selector)
    .nth(index)
    .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));

/** The scroll offset of every frame inside a host, and how far through its page that is (0 to 1). */
const scrollState = (page: Page, hostSelector = '[data-ba]', index = 0) =>
  page.evaluate(
    ([selector, nth]) => {
      const host = document.querySelectorAll(selector as string)[nth as number];
      return [...(host?.querySelectorAll<HTMLIFrameElement>('iframe') ?? [])].map((frame) => {
        const win = frame.contentWindow;
        const doc = frame.contentDocument;
        const max = Math.max(1, (doc?.documentElement.scrollHeight ?? 0) - (win?.innerHeight ?? 0));
        return { top: win?.scrollY ?? 0, max, share: (win?.scrollY ?? 0) / max };
      });
    },
    [hostSelector, index] as const,
  );

async function waitUntilLive(page: Page, host: Locator = slider(page), stages = 2) {
  await expect(host).toHaveAttribute('data-live', '', { timeout: 20000 });
  await expect(host.locator('[data-live-stage][data-live-ready]')).toHaveCount(stages, {
    timeout: 20000,
  });
}

/** Counts layout shifts from the very start, so a test can check that nothing moved when a site arrived. */
async function trackLayoutShifts(page: Page) {
  await page.addInitScript(() => {
    const store = window as unknown as { __shifts: { value: number; sources: string[] }[] };
    store.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
        sources?: { node?: Node }[];
      }[]) {
        if (entry.hadRecentInput) continue;
        store.__shifts.push({
          value: entry.value,
          sources: (entry.sources ?? []).map((source) => {
            const element =
              source.node instanceof Element ? source.node : source.node?.parentElement;
            return element?.closest('[data-live-host]') ? 'live-host' : (element?.tagName ?? '?');
          }),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const shifts = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __shifts: { value: number; sources: string[] }[] }).__shifts,
  );

test.describe('live demo sites in the slider and the Work previews', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop behaviour; the phone layout has its own test.');
  test.use({ viewport: { width: 1280, height: 800 } });
  // The reduced-motion project would stop the loop: these tests need motion on (one test checks reduce).
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('every preview starts as a "Preview Loading" placeholder; nothing from /demos loads with the page', async ({
    page,
  }) => {
    const demoRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/demos/')) demoRequests.push(request.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(demoRequests).toEqual([]);
    // Four panels (two in the slider, one per Work project) fill their boxes from the first paint. The
    // slider shows its wheel and words once, over both panels, so three status blocks in all.
    await expect(page.locator('[data-live-stage] .preview-loading')).toHaveCount(4);
    const statuses = page.locator('.preview-status');
    await expect(statuses).toHaveCount(3);
    for (const status of await statuses.all()) {
      await expect(status.locator('.preview-text-loading')).toHaveText('Preview Loading');
      await expect(status.locator('.preview-wheel')).toHaveCount(1);
    }
    await centre(page, '[data-ba]');
    await expect(frames(page)).toHaveCount(2);
  });

  test('mounts the same builds as the sandbox, as decorative frames in preview mode', async ({
    page,
  }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);

    const after = page.locator(`[data-ba] iframe[src="${AFTER}?preview=1"]`);
    const before = page.locator(`[data-ba] iframe[src="${BEFORE}?preview=1"]`);
    await expect(after).toHaveCount(1);
    await expect(before).toHaveCount(1);
    for (const frame of [after, before]) {
      await expect(frame).toHaveAttribute('aria-hidden', 'true');
      await expect(frame).toHaveAttribute('tabindex', '-1');
      await expect(frame).toHaveAttribute('inert', '');
      await expect(frame).toHaveAttribute('title', /Saltwater Row/);
      await expect(frame).toHaveCSS('pointer-events', 'none');
      await expect(frame).toHaveCSS('opacity', '1');
    }
    await expect(after).toHaveAttribute('title', 'Saltwater Row: the new website');
    await expect(before).toHaveAttribute('title', 'Saltwater Row: the old website');
    // The 1440px layout, scaled to the stage, never wider than the slider.
    const fits = await page.evaluate(() => {
      const stage = document.querySelector('[data-ba] .stage')?.getBoundingClientRect();
      return [...document.querySelectorAll('[data-ba] iframe')].map(
        (frame) => Math.abs(frame.getBoundingClientRect().width - (stage?.width ?? 0)) < 2,
      );
    });
    expect(fits).toEqual([true, true]);
    // The new site has the live water hero.
    const tier = await page.evaluate((source) => {
      const doc = document.querySelector<HTMLIFrameElement>(
        `iframe[src^="${source}"]`,
      )?.contentDocument;
      return doc?.querySelector('[data-water-root]')?.getAttribute('data-water-tier') ?? 'none';
    }, AFTER);
    expect(tier).not.toBe('none');
  });

  test('hides the scroll bar inside the previews', async ({ page }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    const styles = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLIFrameElement>('[data-ba] iframe')].map((frame) => {
        const doc = frame.contentDocument;
        return doc ? getComputedStyle(doc.documentElement).scrollbarWidth : 'no document';
      }),
    );
    expect(styles).toEqual(['none', 'none']);
  });

  test('cross-fades the live site over the placeholder: no jump, no layout shift, same box', async ({
    page,
  }) => {
    await trackLayoutShifts(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const stageBefore = await page.locator('[data-ba] .stage').boundingBox();
    const shiftsBefore = await shifts(page);
    // Record both opacities every frame while the site loads and fades in.
    await page.evaluate(() => {
      const samples: { frame: number; placeholder: number }[] = [];
      (window as unknown as { __fade: typeof samples }).__fade = samples;
      const read = () => {
        const frame = document.querySelector('[data-ba] .after iframe');
        const placeholder = document.querySelector('[data-ba] .after .preview-loading');
        if (frame && placeholder) {
          samples.push({
            frame: Number(getComputedStyle(frame).opacity),
            placeholder: Number(getComputedStyle(placeholder).opacity),
          });
        }
        requestAnimationFrame(read);
      };
      requestAnimationFrame(read);
    });
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await page.waitForTimeout(800);

    const samples = await page.evaluate(
      () => (window as unknown as { __fade: { frame: number; placeholder: number }[] }).__fade,
    );
    expect(samples.length).toBeGreaterThan(10);
    // The site only ever fades in, the placeholder only ever fades out, and they overlap in the middle.
    for (let index = 1; index < samples.length; index++) {
      expect(samples[index]?.frame ?? 0).toBeGreaterThanOrEqual(
        (samples[index - 1]?.frame ?? 0) - 1e-6,
      );
      expect(samples[index]?.placeholder ?? 1).toBeLessThanOrEqual(
        (samples[index - 1]?.placeholder ?? 1) + 1e-6,
      );
    }
    expect(samples.some((sample) => sample.frame > 0.05 && sample.frame < 0.95)).toBe(true);
    expect(samples.at(-1)).toEqual({ frame: 1, placeholder: 0 });
    // The frame, stage and page did not change size, and nothing shifted because of it.
    const stageAfter = await page.locator('[data-ba] .stage').boundingBox();
    expect(stageAfter?.width).toBe(stageBefore?.width);
    expect(stageAfter?.height).toBe(stageBefore?.height);
    const after = await shifts(page);
    expect(after.length - shiftsBefore.length).toBe(0);
    expect(after.filter((shift) => shift.sources.includes('live-host'))).toEqual([]);
  });

  test('every preview keeps its size and shifts nothing when its site arrives', async ({
    page,
  }) => {
    await trackLayoutShifts(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hosts = page.locator('[data-live-host]');
    const count = await hosts.count();
    expect(count).toBe(3); // the slider and one preview per Work project
    for (let index = 0; index < count; index++) {
      const host = hosts.nth(index);
      const box = await host.boundingBox();
      const shiftsBefore = (await shifts(page)).length;
      await host.evaluate((element) =>
        element.scrollIntoView({ block: 'center', behavior: 'instant' }),
      );
      await waitUntilLive(page, host, await host.locator('[data-live-stage]').count());
      await page.waitForTimeout(700);
      const settled = await host.boundingBox();
      expect(settled?.width, `preview ${index} width`).toBe(box?.width);
      expect(settled?.height, `preview ${index} height`).toBe(box?.height);
      expect((await shifts(page)).length - shiftsBefore, `preview ${index} layout shifts`).toBe(0);
    }
  });

  test('the slider still works by keyboard and mouse over the live pages', async ({ page }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    const range = page.locator('#ba-range');
    await range.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(range).toHaveValue('49');
    await page.keyboard.press('End');
    await expect(range).toHaveValue('100');

    const box = await page.locator('[data-ba] .stage').boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.5);
    await expect.poll(async () => Number(await range.inputValue())).toBeLessThan(35);
    // The wipe resizes the window onto the Before page; the page inside keeps its size.
    await expect(page.locator('[data-ba-before]')).toHaveCSS('width', /^[1-9]/);
    const widths = await page.evaluate(() => {
      const stage = document.querySelector('[data-ba] .stage')?.getBoundingClientRect().width ?? 0;
      const frame =
        document.querySelector('[data-ba] .before iframe')?.getBoundingClientRect().width ?? 0;
      return { stage, frame };
    });
    expect(Math.abs(widths.frame - widths.stage)).toBeLessThan(2);
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('IFRAME');
  });

  /**
   * Samples the position over time. A short loop keeps the test quick; the timing (0.3 s holds, 1 s
   * eases) is the same one the real loops use.
   */
  async function sampleLoop(page: Page, host: string, index: number, seconds: number) {
    const samples: { t: number; share: number; other: number }[] = [];
    const startedAt = Date.now();
    while (Date.now() - startedAt < seconds * 1000) {
      const state = await scrollState(page, host, index);
      samples.push({
        t: Date.now() - startedAt,
        share: state[0]?.share ?? 0,
        other: state[1]?.share ?? state[0]?.share ?? 0,
      });
      await page.waitForTimeout(50);
    }
    return samples;
  }

  test('scrolls the real pages along the curve: no initial hold, short holds at the ends, aligned', async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelector('[data-ba]')?.setAttribute('data-browse-duration', '8');
      });
    });
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await expect(slider(page)).toHaveAttribute('data-in-view', '');

    const samples = await sampleLoop(page, '[data-ba]', 0, 22);
    // It is already moving soon after the sampling begins: there is no hold to wait through.
    const first = samples.findIndex((sample) => sample.share > 0.002);
    expect(first, 'it moves').toBeGreaterThan(-1);
    expect(samples[first]?.t ?? 99999).toBeLessThan(2500);
    // Before and After follow the same progress.
    for (const sample of samples) {
      expect(Math.abs(sample.share - sample.other), `at ${sample.t}`).toBeLessThan(0.08);
    }
    // It reaches both ends and turns round quickly: never still at an end for more than about a second.
    expect(Math.max(...samples.map((sample) => sample.share))).toBeGreaterThan(0.99);
    let stillSince = 0;
    let longestStill = 0;
    for (const [index, sample] of samples.entries()) {
      const previous = samples[index - 1];
      const moved = previous ? Math.abs(sample.share - previous.share) > 0.0005 : true;
      if (moved) stillSince = sample.t;
      longestStill = Math.max(longestStill, sample.t - stillSince);
    }
    expect(longestStill, 'longest time standing still').toBeLessThan(1100);
    // And it came back down after the end.
    const peak = samples.findIndex((sample) => sample.share > 0.99);
    expect(Math.min(...samples.slice(peak).map((sample) => sample.share))).toBeLessThan(0.7);
  });

  test('does not pause while the pointer is over it or the slider has focus', async ({ page }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await expect
      .poll(async () => (await scrollState(page))[0]?.top ?? 0, { timeout: 8000 })
      .toBeGreaterThan(5);

    const box = await page.locator('[data-ba] .stage').boundingBox();
    if (!box) throw new Error('no stage');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.locator('#ba-range').focus();
    const held = (await scrollState(page))[0]?.top ?? 0;
    await page.waitForTimeout(1500);
    expect((await scrollState(page))[0]?.top ?? 0).toBeGreaterThan(held + 20);
  });

  test('leaving and re-entering the view never shows a jump, and the water stops while away', async ({
    page,
  }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await expect
      .poll(async () => (await scrollState(page))[0]?.top ?? 0, { timeout: 8000 })
      .toBeGreaterThan(30);

    // Mostly out of view but still partly visible: the pages must keep their place (no reset to the top).
    const before = (await scrollState(page))[0]?.top ?? 0;
    await page.evaluate(() => {
      const host = document.querySelector('[data-ba]');
      const rect = host?.getBoundingClientRect();
      if (rect) window.scrollBy({ top: rect.bottom - 120, behavior: 'instant' });
    });
    await page.waitForTimeout(400);
    const partlyOut = (await scrollState(page))[0]?.top ?? 0;
    expect(partlyOut).toBeGreaterThanOrEqual(before);

    // Fully out of view: the demo is paused by message, so its water loop stops.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(600);
    const waterLoops = await page.evaluate(async () => {
      const frame = document.querySelector<HTMLIFrameElement>(
        '[data-ba] iframe[src*="saltwater-row/"]',
      );
      const win = frame?.contentWindow;
      if (!win) return -1;
      let count = 0;
      const original = win.requestAnimationFrame.bind(win);
      win.requestAnimationFrame = (callback) => {
        if (callback.toString().includes('lastRenderAt')) count += 1;
        return original(callback);
      };
      await new Promise((resolve) => setTimeout(resolve, 800));
      win.requestAnimationFrame = original;
      return count;
    });
    expect(waterLoops).toBe(0);

    // Back in view: it starts again from the top, with the water running.
    await centre(page, '[data-ba]');
    await expect
      .poll(async () => (await scrollState(page))[0]?.top ?? 0, { timeout: 8000 })
      .toBeGreaterThan(0);
    const resumed = await page.evaluate(async () => {
      const win = document.querySelector<HTMLIFrameElement>(
        '[data-ba] iframe[src*="saltwater-row/"]',
      )?.contentWindow;
      if (!win) return -1;
      let count = 0;
      const original = win.requestAnimationFrame.bind(win);
      win.requestAnimationFrame = (callback) => {
        if (callback.toString().includes('lastRenderAt')) count += 1;
        return original(callback);
      };
      await new Promise((resolve) => setTimeout(resolve, 1000));
      win.requestAnimationFrame = original;
      return count;
    });
    expect(resumed).toBeGreaterThan(0);
  });

  test('shows a calm "Preview unavailable" when a demo is missing, in the same box', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/demos/**', (route) => route.fulfill({ status: 404, body: 'missing' }));
    await page.goto('/');
    const box = await page.locator('[data-ba] .stage').boundingBox();
    await centre(page, '[data-ba]');
    const stages = page.locator('[data-ba] [data-live-stage][data-live-state="unavailable"]');
    await expect(stages).toHaveCount(2);
    await expect(frames(page)).toHaveCount(0);
    await expect(slider(page)).not.toHaveAttribute('data-live', '');
    const status = page.locator('[data-ba] .stage-status .preview-status');
    await expect(status.locator('.preview-text-unavailable')).toBeVisible();
    await expect(status.locator('.preview-text-unavailable')).toHaveText('Preview unavailable');
    await expect(status.locator('.preview-text-loading')).toBeHidden();
    await expect(status.locator('.preview-wheel-wrap')).toBeHidden();
    const settled = await page.locator('[data-ba] .stage').boundingBox();
    expect(settled?.width).toBe(box?.width);
    expect(settled?.height).toBe(box?.height);
    expect(errors).toEqual([]);
  });

  test('shows the placeholder only, and loads nothing, under Save-Data', async ({ page }) => {
    const demoRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/demos/')) demoRequests.push(request.url());
    });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
    });
    await page.goto('/');
    await centre(page, '[data-ba]');
    await page.waitForTimeout(1500);
    await expect(frames(page)).toHaveCount(0);
    expect(demoRequests).toEqual([]);
    await expect(page.locator('[data-ba] .preview-text-unavailable').first()).toBeVisible();
  });

  test('under reduced motion the live pages stay at the top and never scroll; the wheel is still', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('[data-ba] .preview-wheel').first()).toHaveCSS(
      'animation-name',
      'none',
    );
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await page.waitForTimeout(2500);
    const state = await scrollState(page);
    expect(state.map((entry) => entry.top)).toEqual([0, 0]);
  });

  test('the loading wheel turns with full motion', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-ba] .preview-wheel').first()).toHaveCSS(
      'animation-name',
      'preview-wheel',
    );
  });

  test('the Work previews show the real builds, small windows onto the same sites as /sandbox', async ({
    page,
  }) => {
    await page.goto('/');
    const hosts = page.locator(WORK_HOSTS);
    await expect(hosts).toHaveCount(2);
    for (const [index, source] of [REFINED, MOD_LABS].entries()) {
      await centre(page, WORK_HOSTS, index);
      const frame = page.locator(`#work iframe[src="${source}?preview=1"]`);
      await expect(frame).toHaveCount(1);
      await expect(frame).toHaveAttribute('aria-hidden', 'true');
      await expect(frame).toHaveAttribute('inert', '');
      await expect(hosts.nth(index)).toHaveAttribute('data-browse-duration', '26');
      await waitUntilLive(page, hosts.nth(index), 1);
    }
    await expect(page.locator(`#work iframe[src^="${MOD_LABS}"]`)).toHaveAttribute(
      'title',
      'Mod Labs: the website',
    );
  });

  test('the page around the live frames has no console errors, banned words or axe violations', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await revealEverything(page);
    expect(await axeViolations(page)).toEqual([]);
    expect(errors.filter((text) => !/Failed to load resource/.test(text))).toEqual([]);

    const text = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLIFrameElement>('[data-ba] iframe')]
        .map((frame) => frame.contentDocument?.body.innerText ?? '')
        .join('\n'),
    );
    expect(text.length).toBeGreaterThan(200);
    expect(text).not.toMatch(/template|framework|\bAI\b/i);
  });
});

test.describe('Work previews: same size, same rules', () => {
  test.skip(({ isMobile }) => isMobile, 'Viewports are set per test.');

  for (const width of [1440, 1280, 1024, 768, 390]) {
    test(`every preview has the same box at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const boxes = await page
        .locator('#work [data-testid="project-window"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const rect = node.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
        );
      expect(boxes).toHaveLength(2);
      expect(
        Math.abs((boxes[0]?.width ?? 0) - (boxes[1]?.width ?? 1)),
        `width at ${width}`,
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs((boxes[0]?.height ?? 0) - (boxes[1]?.height ?? 1)),
        `height at ${width}`,
      ).toBeLessThanOrEqual(1);
    });
  }

  test.describe('scrolling rules, for every Work preview', () => {
    test.use({ viewport: { width: 1280, height: 800 } });
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          document
            .querySelectorAll('#work [data-live-host]')
            .forEach((host) => host.setAttribute('data-browse-duration', '8'));
        });
      });
    });

    for (const index of [0, 1]) {
      test(`preview ${index + 1}: waits until fully visible, then scrolls, never pauses on hover, turns quickly`, async ({
        page,
      }) => {
        test.setTimeout(90000);
        await page.goto('/');
        const host = page.locator(WORK_HOSTS).nth(index);
        // Only partly visible: it is loaded but does not move.
        await host.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          window.scrollBy({ top: rect.top - window.innerHeight + 120, behavior: 'instant' });
        });
        await waitUntilLive(page, host, 1);
        await page.waitForTimeout(1200);
        await expect(host).not.toHaveAttribute('data-in-view', '');
        expect((await scrollState(page, WORK_HOSTS, index))[0]?.top).toBe(0);

        // Fully visible: it starts at once.
        await centre(page, WORK_HOSTS, index);
        await expect(host).toHaveAttribute('data-in-view', '');
        await expect
          .poll(async () => (await scrollState(page, WORK_HOSTS, index))[0]?.top ?? 0, {
            timeout: 8000,
          })
          .toBeGreaterThan(5);

        // Hovering does not stop it.
        const box = await host.boundingBox();
        if (!box) throw new Error('no preview');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        const held = (await scrollState(page, WORK_HOSTS, index))[0]?.top ?? 0;
        await page.waitForTimeout(1200);
        expect((await scrollState(page, WORK_HOSTS, index))[0]?.top ?? 0).not.toBe(held);

        // It reaches the end and comes back without standing still.
        const samples = await sampleLoopFor(page, index, 14);
        expect(Math.max(...samples.map((sample) => sample.share))).toBeGreaterThan(0.99);
        const peak = samples.findIndex((sample) => sample.share > 0.99);
        expect(Math.min(...samples.slice(peak).map((sample) => sample.share))).toBeLessThan(0.8);
        let stillSince = 0;
        let longestStill = 0;
        for (const [at, sample] of samples.entries()) {
          const previous = samples[at - 1];
          if (!previous || Math.abs(sample.share - previous.share) > 0.0005) stillSince = sample.t;
          longestStill = Math.max(longestStill, sample.t - stillSince);
        }
        expect(longestStill, 'longest time standing still').toBeLessThan(1100);
      });
    }
  });
});

async function sampleLoopFor(page: Page, index: number, seconds: number) {
  const samples: { t: number; share: number }[] = [];
  const startedAt = Date.now();
  while (Date.now() - startedAt < seconds * 1000) {
    const state = await scrollState(page, WORK_HOSTS, index);
    samples.push({ t: Date.now() - startedAt, share: state[0]?.share ?? 0 });
    await page.waitForTimeout(50);
  }
  return samples;
}

test.describe('phone layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'Phone projects only.');

  test('shows the live pages scaled into the 4:3 slider with no overflow', async ({ page }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    const geometry = await page.evaluate(() => {
      const stage = document.querySelector('[data-ba] .stage')?.getBoundingClientRect();
      const frame = document.querySelector('[data-ba] iframe')?.getBoundingClientRect();
      return {
        stageWidth: stage?.width ?? 0,
        frameWidth: frame?.width ?? 0,
        frameHeight: frame?.height ?? 0,
        stageHeight: stage?.height ?? 0,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(Math.abs(geometry.frameWidth - geometry.stageWidth)).toBeLessThan(2);
    // The frame is a hair taller than the stage (a bleed for the sub-pixel shift), clipped by it.
    expect(geometry.frameHeight).toBeGreaterThanOrEqual(geometry.stageHeight - 2);
    expect(geometry.frameHeight - geometry.stageHeight).toBeLessThan(4);
    expect(geometry.overflow).toBeLessThanOrEqual(0);
  });
});
