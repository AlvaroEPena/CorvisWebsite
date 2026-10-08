import { expect, type Page, test } from '@playwright/test';

import { axeViolations, revealEverything } from './support';

/**
 * The home page shows the REAL demo builds (the same ones as /sandbox) in the before/after slider and
 * the Work preview, laid over the CSS mocks, which stay as the poster. See scripts/live-browse.ts.
 */
const AFTER = '/demos/saltwater-row/index.html';
const BEFORE = '/demos/saltwater-row-before/index.html';
const REFINED = '/demos/refined-celebrations/index.html';
const MOD_LABS = '/demos/mod-labs/index.html';

const slider = (page: Page) => page.getByTestId('redesign-slider');
const frames = (page: Page) => page.locator('[data-ba] iframe');

/** Centres an element so the whole of it is on screen (a scroll-through starts once it is). */
const centre = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));

/** The scroll offset of every frame in the slider, and how far through its page that is (0 to 1). */
const scrollState = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLIFrameElement>('[data-ba] iframe')].map((frame) => {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      const max = Math.max(1, (doc?.documentElement.scrollHeight ?? 0) - (win?.innerHeight ?? 0));
      return { top: win?.scrollY ?? 0, max, share: (win?.scrollY ?? 0) / max };
    }),
  );

async function waitUntilLive(page: Page) {
  await expect(slider(page)).toHaveAttribute('data-live', '', { timeout: 20000 });
  await expect(page.locator('[data-ba] [data-live-stage][data-live-ready]')).toHaveCount(2, {
    timeout: 20000,
  });
}

test.describe('live demo sites in the slider and the Work preview', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop behaviour; the phone layout has its own test.');
  test.use({ viewport: { width: 1280, height: 800 } });
  // The reduced-motion project would stop the loop: these tests need motion on (one test checks reduce).
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });

  test('nothing from /demos loads with the page; the frames mount when it is near', async ({
    page,
  }) => {
    const demoRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/demos/')) demoRequests.push(request.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(frames(page)).toHaveCount(0);
    expect(demoRequests).toEqual([]);

    await centre(page, '[data-ba]');
    await expect(frames(page)).toHaveCount(2);
  });

  test('mounts the same builds as the sandbox, as decorative frames', async ({ page }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);

    const after = page.locator(`[data-ba] iframe[src="${AFTER}"]`);
    const before = page.locator(`[data-ba] iframe[src="${BEFORE}"]`);
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
    // Frame sizes: the 1440px layout, scaled to the stage, never wider than the slider.
    const fits = await page.evaluate(() => {
      const stage = document.querySelector('[data-ba] .stage')?.getBoundingClientRect();
      return [...document.querySelectorAll('[data-ba] iframe')].map((frame) => {
        const box = frame.getBoundingClientRect();
        return Math.abs(box.width - (stage?.width ?? 0)) < 2;
      });
    });
    expect(fits).toEqual([true, true]);
    // The same pages as /sandbox: both demos answer, and the new one has the live water hero.
    await expect(page.locator('[data-ba] [data-live-stage]')).toHaveCount(2);
    const water = await page.evaluate((source) => {
      const doc = document.querySelector<HTMLIFrameElement>(
        `iframe[src="${source}"]`,
      )?.contentDocument;
      const root = doc?.querySelector('[data-water-root]');
      return root ? (root.getAttribute('data-water-tier') ?? '') : 'none';
    }, AFTER);
    expect(water).not.toBe('none');
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
    // Nothing inside a frame took focus or the click.
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('IFRAME');
  });

  test('scrolls the real pages along the curve: holds, glides, stays aligned', async ({ page }) => {
    test.setTimeout(90000);
    // A short loop keeps the test quick; the tuning is the same one the CSS uses.
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const host = document.querySelector('[data-ba]');
        host?.setAttribute('data-browse-duration', '8');
        host?.setAttribute('data-browse-tuning', 'browse');
      });
    });
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await expect(slider(page)).toHaveAttribute('data-in-view', '');

    const samples: { t: number; shares: number[] }[] = [];
    const startedAt = Date.now();
    // Sample until it has gone down and come back up (or give up): a loaded machine takes longer.
    const turnedAround = () => {
      const shares = samples.map((sample) => sample.shares[0] ?? 0);
      const top = shares.indexOf(Math.max(...shares));
      return Math.max(...shares) > 0.97 && shares.slice(top + 8).some((share) => share < 0.7);
    };
    while (Date.now() - startedAt < 50000 && !turnedAround()) {
      const state = await scrollState(page);
      samples.push({ t: Date.now() - startedAt, shares: state.map((entry) => entry.share) });
      await page.waitForTimeout(150);
    }
    const first = samples.findIndex((sample) => (sample.shares[0] ?? 0) > 0.002);
    expect(first, 'it starts scrolling').toBeGreaterThan(-1);
    // Once the pages are live (the first load takes a moment) the loop starts at once: a short hold,
    // then the eased start. Allow for slow software rendering in CI.
    expect(samples[first]?.t ?? 99999).toBeLessThan(4500);
    // Both panes follow the same progress.
    for (const sample of samples) {
      expect(
        Math.abs((sample.shares[0] ?? 0) - (sample.shares[1] ?? 0)),
        `at ${sample.t}`,
      ).toBeLessThan(0.08);
    }
    // Reaches the bottom (hold), then comes back up.
    const peak = Math.max(...samples.map((sample) => sample.shares[0] ?? 0));
    expect(peak).toBeGreaterThan(0.97);
    const peakIndex = samples.findIndex((sample) => (sample.shares[0] ?? 0) === peak);
    const later = samples.slice(peakIndex + 8).map((sample) => sample.shares[0] ?? 1);
    expect(Math.min(...later)).toBeLessThan(0.75);
  });

  test('pauses while the pointer is over it, then carries on', async ({ page }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await expect
      .poll(async () => (await scrollState(page))[0]?.top ?? 0, { timeout: 8000 })
      .toBeGreaterThan(5);

    const box = await page.locator('[data-ba] .stage').boundingBox();
    if (!box) throw new Error('no stage');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    const held = (await scrollState(page))[0]?.top ?? 0;
    await page.waitForTimeout(1200);
    expect((await scrollState(page))[0]?.top ?? 0).toBe(held);
    await page.mouse.move(2, 2);
    await expect.poll(async () => (await scrollState(page))[0]?.top ?? 0).toBeGreaterThan(held);
  });

  test('parks the pages away from the top while off screen, so the water stops', async ({
    page,
  }) => {
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect
      .poll(async () => (await scrollState(page))[0]?.share ?? 0, { timeout: 5000 })
      .toBeGreaterThan(0.98);
    // The water hero lives at the top of the page: it is out of the frame's viewport, so it idles.
    const heroLoopRunning = await page.evaluate(async () => {
      const frame = document.querySelector<HTMLIFrameElement>(
        '[data-ba] iframe[src$="saltwater-row/index.html"]',
      );
      const win = frame?.contentWindow;
      if (!win) return true;
      let waterFrames = 0;
      const original = win.requestAnimationFrame.bind(win);
      win.requestAnimationFrame = (callback) => {
        if (callback.toString().includes('lastRenderAt')) waterFrames += 1;
        return original(callback);
      };
      await new Promise((resolve) => setTimeout(resolve, 800));
      win.requestAnimationFrame = original;
      return waterFrames > 0;
    });
    expect(heroLoopRunning).toBe(false);

    await centre(page, '[data-ba]');
    await expect
      .poll(async () => (await scrollState(page))[0]?.share ?? 1, { timeout: 5000 })
      .toBeLessThan(0.3);
  });

  test('falls back to the poster when a demo is missing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/demos/**', (route) => route.fulfill({ status: 404, body: 'missing' }));
    await page.goto('/');
    await centre(page, '[data-ba]');
    await expect(
      page.locator('[data-ba] [data-live-stage][data-live-state="unavailable"]'),
    ).toHaveCount(2);
    await expect(frames(page)).toHaveCount(0);
    await expect(slider(page)).not.toHaveAttribute('data-live', '');
    // The mock keeps scrolling under the CSS animation, as before.
    await expect(slider(page)).toHaveAttribute('data-in-view', '');
    await expect(page.locator('[data-ba] .browse-track').first()).toHaveCSS(
      'animation-name',
      'browse-slow',
    );
    expect(errors).toEqual([]);
  });

  test('shows the poster only under Save-Data', async ({ page }) => {
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
  });

  test('under reduced motion the live pages stay at the top and never scroll', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await centre(page, '[data-ba]');
    await waitUntilLive(page);
    await page.waitForTimeout(2500);
    const state = await scrollState(page);
    expect(state.map((entry) => entry.top)).toEqual([0, 0]);
  });

  test('the Work preview shows the real Refined Celebrations build', async ({ page }) => {
    await page.goto('/');
    await centre(page, '#work .browse-host');
    const frame = page.locator(`#work iframe[src="${REFINED}"]`);
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('aria-hidden', 'true');
    await expect(frame).toHaveAttribute('inert', '');
    await expect(page.locator('#work [data-live-stage][data-live-ready]')).toHaveCount(1, {
      timeout: 20000,
    });
    await expect(page.locator('#work .browse-host').first()).toHaveAttribute('data-live', '');
  });

  test('the Work preview shows the real Mod Labs build as the second project', async ({ page }) => {
    await page.goto('/');
    const hosts = page.locator('#work .browse-host');
    await expect(hosts).toHaveCount(2);
    await hosts
      .nth(1)
      .evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const frame = page.locator(`#work iframe[src="${MOD_LABS}"]`);
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('title', 'Mod Labs: the website');
    await expect(frame).toHaveAttribute('inert', '');
    await expect(hosts.nth(1)).toHaveAttribute('data-browse-duration', '26');
    await expect(hosts.nth(1)).toHaveAttribute('data-live', '', { timeout: 20000 });
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
    expect(Math.abs(geometry.frameHeight - geometry.stageHeight)).toBeLessThan(2);
    expect(geometry.overflow).toBeLessThanOrEqual(0);
  });
});
