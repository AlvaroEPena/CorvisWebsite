import { expect, type Page, test } from '@playwright/test';

import { demoExists, expectNoHorizontalScroll, revealEverything } from './support';

const SALTWATER_AFTER = '/demos/saltwater-row/';
const SALTWATER_BEFORE = '/demos/saltwater-row-before/';
const REFINED = '/demos/refined-celebrations/';
const MOD_LABS = '/demos/mod-labs/';
const GRIT = '/demos/grit/';

/** Answers the demo URLs with a tiny page so these tests never depend on the demo builds. */
async function stubDemos(page: Page): Promise<void> {
  await page.route('**/demos/**', (route) => {
    const { pathname } = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><title>Stub</title><body><main><h1>Stub ${pathname}</h1></main></body>`,
    });
  });
}

const studio = (page: Page) => page.locator('[data-sandbox]');
const tab = (page: Page, id: string) => page.locator(`#sandbox-tab-${id}`);
const activeFrame = (page: Page) => page.locator('iframe[data-active]');
const viewport = (page: Page) => page.locator('[data-viewport]');
const stage = (page: Page) => page.locator('[data-stage]');

/** Opens the page and brings the frame near the viewport, which is what mounts the iframes. */
async function openSandbox(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await stage(page).scrollIntoViewIfNeeded();
}

test.describe('sandbox page chrome', () => {
  test('renders inside the Corvis nav and footer with one h1', async ({ page }) => {
    await page.goto('/sandbox');
    await expect(page).toHaveTitle(/Test drive our work/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Test drive our work.');
    await expect(page.getByTestId('nav')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.locator('header a[aria-current="page"]').first()).toHaveText('Sandbox', {
      useInnerText: true,
    });
  });

  test('is indexable and listed in the sitemap, while demos are disallowed', async ({
    page,
    request,
  }) => {
    await page.goto('/sandbox');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/sandbox$/);
    const sitemap = await request.get('/sitemap-0.xml');
    expect(await sitemap.text()).toContain('/sandbox');
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /demos/');
  });

  test('home links to the sandbox only from the nav, the footer and one explore button', async ({
    page,
  }) => {
    await page.goto('/');
    const outsideChrome = page.locator('main a[href*="sandbox"]:not([data-testid="view-sandbox"])');
    await expect(outsideChrome).toHaveCount(1);
    await expect(outsideChrome).toHaveAttribute('href', '/sandbox#saltwater-row/after');
    await expect(outsideChrome).toHaveText('Explore this redesign site and more');
    await expect(page.locator('header a[href="/sandbox"]').first()).toBeAttached();
    await expect(page.locator('footer a[href="/sandbox"]')).toHaveCount(1);
    // The button sits directly under the slider, inside the before/after section.
    await expect(page.locator('#redesign').getByTestId('explore-sandbox')).toBeVisible();
  });

  test('the sandbox footer link works from another page too', async ({ page }) => {
    await page.goto('/privacy');
    await page.locator('footer a[href="/sandbox"]').click();
    await expect(page).toHaveURL(/\/sandbox$/);
  });

  test('has no horizontal overflow at the sizes the spec lists', async ({ page }) => {
    await stubDemos(page);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/sandbox');
      await revealEverything(page);
      await expectNoHorizontalScroll(page);
    }
  });
});

test.describe('sandbox project picker and versions', () => {
  test.beforeEach(async ({ page }) => {
    await stubDemos(page);
  });

  test('the picker switches projects and updates address bar, panel and hash', async ({ page }) => {
    await openSandbox(page, '/sandbox');
    await expect(tab(page, 'saltwater-row')).toHaveAttribute('aria-selected', 'true');
    await expect(studio(page).locator('[data-address]')).toHaveText('saltwaterrow.example');

    await tab(page, 'refined-celebrations').click();
    await expect(tab(page, 'refined-celebrations')).toHaveAttribute('aria-selected', 'true');
    await expect(tab(page, 'saltwater-row')).toHaveAttribute('aria-selected', 'false');
    await expect(studio(page).locator('[data-address]')).toHaveText('refinedcelebrations.co');
    await expect(viewport(page)).toHaveAttribute(
      'aria-labelledby',
      'sandbox-tab-refined-celebrations',
    );
    await expect(page).toHaveURL(/#refined-celebrations\/after$/);
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(REFINED));
    await expect(studio(page).locator('[data-status]')).toContainText('Refined Celebrations');
  });

  test('lists four projects in a clean grid on every screen size', async ({ page }) => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await openSandbox(page, '/sandbox');
      await expect(page.locator('[data-picker] [role="tab"]')).toHaveCount(4);
      const boxes = await page
        .locator('[data-picker] [role="tab"]')
        .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()));
      for (const box of boxes) {
        expect(box.right, `card inside the page at ${width}`).toBeLessThanOrEqual(width);
      }
      const rows = new Set(boxes.map((box) => Math.round(box.top)));
      // One column on phones (4 rows), a tidy 2 by 2 from tablet up, all four cards the same width.
      expect(rows.size, `rows at ${width}`).toBe(width < 640 ? 4 : 2);
      for (const box of boxes) {
        expect(Math.abs(box.width - (boxes[0]?.width ?? 0)), `card width at ${width}`).toBeLessThan(
          2,
        );
      }
      await expectNoHorizontalScroll(page);
    }
  });

  test('deep link #mod-labs/after selects Mod Labs, with no Before/After toggle', async ({
    page,
  }) => {
    await openSandbox(page, '/sandbox#mod-labs/after');
    await expect(tab(page, 'mod-labs')).toHaveAttribute('aria-selected', 'true');
    await expect(studio(page).locator('[data-address]')).toHaveText('modlabs.store');
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(MOD_LABS));
    await expect(page.getByRole('button', { name: 'Before' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'After' })).toBeHidden();
    await expect(studio(page).locator('[data-live-label]')).toHaveText('Built from scratch');
    // A deep link to a version that does not exist falls back to the one that does.
    await openSandbox(page, '/sandbox#mod-labs/before');
    await expect(tab(page, 'mod-labs')).toHaveAttribute('aria-selected', 'true');
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(MOD_LABS));
  });

  test('deep link #grit/after selects the Grit concept, with no Before/After toggle', async ({
    page,
  }) => {
    await openSandbox(page, '/sandbox#grit/after');
    await expect(tab(page, 'grit')).toHaveAttribute('aria-selected', 'true');
    await expect(studio(page).locator('[data-address]')).toHaveText('grit.example');
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(GRIT));
    await expect(page.getByRole('button', { name: 'Before' })).toBeHidden();
    await expect(studio(page).locator('[data-live-label]')).toHaveText('Built from scratch');
    await expect(tab(page, 'grit')).toContainText('concept');
    await expect(page.getByText(/concept projects are previews/i)).toBeVisible();
  });

  test('Before/After toggle exists for saltwater-row and swaps the active frame', async ({
    page,
  }) => {
    await openSandbox(page, '/sandbox');
    const group = page.getByRole('group', { name: 'Version' });
    await expect(group).toBeVisible();
    const before = group.getByRole('button', { name: 'Before' });
    const after = group.getByRole('button', { name: 'After' });
    await expect(after).toHaveAttribute('aria-pressed', 'true');
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(SALTWATER_AFTER));

    await before.click();
    await expect(before).toHaveAttribute('aria-pressed', 'true');
    await expect(after).toHaveAttribute('aria-pressed', 'false');
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(SALTWATER_BEFORE));
    await expect(page).toHaveURL(/#saltwater-row\/before$/);
    await expect(studio(page).locator('[data-status]')).toHaveText(/old website/);

    // Both frames stay mounted so switching back is instant.
    await expect(page.locator('iframe')).toHaveCount(2);
    await after.click();
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(SALTWATER_AFTER));
    await expect(page.locator('iframe')).toHaveCount(2);
    await expect(studio(page).locator('[data-status]')).toHaveText(/new website/);
  });

  test('a fresh design shows "Built from scratch" and no Before/After toggle', async ({ page }) => {
    await openSandbox(page, '/sandbox#refined-celebrations/after');
    await expect(page.getByRole('group', { name: 'Version' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Before' })).toBeHidden();
    await expect(page.getByText('Built from scratch', { exact: true })).toBeVisible();
  });

  test('deep links pick the project and version, and bad ones fall back', async ({ page }) => {
    await openSandbox(page, '/sandbox#saltwater-row/before');
    await expect(tab(page, 'saltwater-row')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'Before' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(SALTWATER_BEFORE));

    await openSandbox(page, '/sandbox#refined-celebrations/before');
    await expect(tab(page, 'refined-celebrations')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('group', { name: 'Version' })).toBeHidden();

    await openSandbox(page, '/sandbox#nonsense/before');
    await expect(tab(page, 'saltwater-row')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'After' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('the home page explore button lands on the redesign, new version', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('explore-sandbox').click();
    await expect(page).toHaveURL(/\/sandbox#saltwater-row\/after$/);
    await expect(tab(page, 'saltwater-row')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: 'After' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('is fully keyboard operable', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard interaction is a desktop concern.');
    await openSandbox(page, '/sandbox');
    await tab(page, 'saltwater-row').focus();
    await page.keyboard.press('ArrowRight');
    await expect(tab(page, 'refined-celebrations')).toBeFocused();
    await expect(tab(page, 'refined-celebrations')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tab(page, 'saltwater-row')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(tab(page, 'grit')).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tab(page, 'saltwater-row')).toHaveAttribute('aria-selected', 'true');

    const before = page.getByRole('button', { name: 'Before' });
    await before.focus();
    await page.keyboard.press('Enter');
    await expect(before).toHaveAttribute('aria-pressed', 'true');
    const after = page.getByRole('button', { name: 'After' });
    await after.focus();
    await page.keyboard.press('Space');
    await expect(after).toHaveAttribute('aria-pressed', 'true');
    const tablet = page.getByRole('button', { name: 'Tablet' });
    await tablet.focus();
    await page.keyboard.press('Enter');
    await expect(tablet).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('sandbox frame', () => {
  test('device switcher resizes the browser frame', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The switcher is hidden below 768px: the page is already phone width.');
    await stubDemos(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/sandbox');
    const frame = page.locator('[data-browser]');
    const widthOf = async () => Math.round((await frame.boundingBox())?.width ?? 0);

    const desktopWidth = await widthOf();
    expect(desktopWidth).toBeGreaterThan(1000);

    await page.getByRole('button', { name: 'Tablet' }).click();
    await expect.poll(widthOf).toBe(820);
    await page.getByRole('button', { name: 'Phone' }).click();
    await expect.poll(widthOf).toBe(390);
    await page.getByRole('button', { name: 'Desktop' }).click();
    await expect.poll(widthOf).toBe(desktopWidth);
  });

  test('mounts a sandboxed, titled, lazy iframe only once the frame is near', async ({ page }) => {
    await stubDemos(page);
    // Narrow and short: the frame starts far below the fold.
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto('/sandbox');
    await expect(page.locator('iframe')).toHaveCount(0);

    await stage(page).scrollIntoViewIfNeeded();
    const frame = activeFrame(page);
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('title', 'Saltwater Row: the new website');
    await expect(frame).toHaveAttribute('loading', 'lazy');
    await expect(frame).toHaveAttribute('allow', 'fullscreen');
    await expect(frame).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-forms allow-popups',
    );
    await expect(page.frameLocator('iframe[data-active]').locator('body')).toBeVisible();
    await expect(viewport(page)).toHaveAttribute('data-state', 'ready');
  });

  test('shows a friendly message when the demo is not available', async ({ page }) => {
    await page.route('**/demos/**', (route) => route.fulfill({ status: 404, body: 'Not found' }));
    await page.goto('/sandbox');
    await stage(page).scrollIntoViewIfNeeded();
    await expect(page.locator('.unavailable-title')).toBeVisible();
    await expect(page.locator('.unavailable-title')).toHaveText(
      'This preview is not available yet',
    );
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(studio(page).locator('[data-status]')).toContainText('not available');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('reload restarts the active frame', async ({ page }) => {
    let requests = 0;
    await page.route('**/demos/**', (route) => {
      if (route.request().method() === 'GET') requests += 1;
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<body>Stub</body>' });
    });
    await page.goto('/sandbox');
    await stage(page).scrollIntoViewIfNeeded();
    await expect(viewport(page)).toHaveAttribute('data-state', 'ready');
    const before = requests;
    await page.getByRole('button', { name: 'Reload preview' }).click();
    await expect.poll(() => requests).toBeGreaterThan(before);
    await expect(viewport(page)).toHaveAttribute('data-state', 'ready');
  });

  test('full screen falls back to a fixed full-window frame and Escape closes it', async ({
    page,
  }) => {
    await stubDemos(page);
    await page.addInitScript(() => {
      // Simulates browsers without element fullscreen (iOS Safari).
      Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined });
    });
    await page.goto('/sandbox');
    await page.getByRole('button', { name: 'Open preview full screen' }).click();
    const frame = page.locator('[data-browser]');
    await expect(frame).toHaveAttribute('data-expanded', '');
    const box = await frame.boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);
    await expect(page.getByRole('button', { name: 'Exit full screen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.keyboard.press('Escape');
    await expect(frame).not.toHaveAttribute('data-expanded', '');
  });

  test('uses the Fullscreen API where it exists', async ({ page }) => {
    await stubDemos(page);
    await page.addInitScript(() => {
      const counter = window as unknown as { fullscreenCalls: number };
      counter.fullscreenCalls = 0;
      Element.prototype.requestFullscreen = function () {
        counter.fullscreenCalls += 1;
        return Promise.resolve();
      };
    });
    await page.goto('/sandbox');
    await page.getByRole('button', { name: 'Open preview full screen' }).click();
    const calls = await page.evaluate(
      () => (window as unknown as { fullscreenCalls: number }).fullscreenCalls,
    );
    expect(calls).toBe(1);
    await expect(page.locator('[data-browser]')).not.toHaveAttribute('data-expanded', '');
  });

  test('honors reduced motion: no wheel spin, wipe or width transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/demos/**', (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/sandbox');
    await expect(page.locator('[data-viewport] .preview-wheel')).toHaveCSS(
      'animation-name',
      'none',
    );
    await expect(page.locator('[data-browser]')).toHaveCSS('transition-duration', '0s');
    await expect(page.locator('.pick').first()).toHaveCSS('transition-duration', '0s');
  });

  test('plays the glass wipe and keeps the loading wheel turning with full motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route('**/demos/**', (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/sandbox');
    await expect(page.locator('[data-viewport] .preview-wheel')).toHaveCSS(
      'animation-name',
      'preview-wheel',
    );
    await tab(page, 'refined-celebrations').click();
    await expect(page.locator('[data-sweep]')).toHaveAttribute('data-play', '');
  });

  test('logs no console errors while switching projects', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    await page.goto('/sandbox');
    await stage(page).scrollIntoViewIfNeeded();
    await tab(page, 'refined-celebrations').click();
    await page.waitForTimeout(800);
    await tab(page, 'saltwater-row').click();
    await page.waitForTimeout(800);

    // A demo that has not been copied into public/demos yet answers 404, which the browser logs.
    const missingDemos =
      !demoExists('saltwater-row') ||
      !demoExists('refined-celebrations') ||
      !demoExists('mod-labs') ||
      !demoExists('grit');
    const unexpected = problems.filter(
      (text) => !(missingDemos && /Failed to load resource.*404/.test(text)),
    );
    expect(unexpected).toEqual([]);
  });
});

test.describe('sandbox demo builds', () => {
  for (const id of [
    'saltwater-row',
    'saltwater-row-before',
    'refined-celebrations',
    'mod-labs',
    'grit',
  ]) {
    test(`${id} exists in public/demos`, () => {
      test.skip(!demoExists(id), `public/demos/${id}/index.html has not been copied in yet.`);
      expect(demoExists(id)).toBe(true);
    });
  }

  test('the real refined-celebrations demo loads inside the frame', async ({ page }) => {
    test.skip(!demoExists('refined-celebrations'), 'Demo build is not in public/demos yet.');
    await page.goto('/sandbox#refined-celebrations/after');
    await stage(page).scrollIntoViewIfNeeded();
    await expect(viewport(page)).toHaveAttribute('data-state', 'ready');
    const frame = page.frameLocator('iframe[data-active]');
    await expect(frame.locator('body')).toBeVisible();
    await expect(frame.locator('h1').first()).toBeVisible();
  });

  test('the real saltwater-row demos load and the toggle swaps them', async ({ page }) => {
    test.skip(
      !demoExists('saltwater-row') || !demoExists('saltwater-row-before'),
      'Demo builds are not in public/demos yet.',
    );
    await page.goto('/sandbox#saltwater-row/after');
    await stage(page).scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[data-active]').locator('body')).toBeVisible();
    await page.getByRole('button', { name: 'Before' }).click();
    await expect(activeFrame(page)).toHaveAttribute('src', new RegExp(SALTWATER_BEFORE));
    await expect(page.frameLocator('iframe[data-active]').locator('body')).toBeVisible();
  });

  test('the real mod-labs demo loads, its navigation works and its forms send nothing', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'The demo shows its menu button in a phone-sized frame.');
    test.skip(!demoExists('mod-labs'), 'Demo build is not in public/demos yet.');
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.method() !== 'HEAD') {
        writes.push(`${request.method()} ${request.url()}`);
      }
    });
    await page.goto('/sandbox#mod-labs/after');
    await stage(page).scrollIntoViewIfNeeded();
    await expect(viewport(page)).toHaveAttribute('data-state', 'ready');
    const frame = page.frameLocator('iframe[data-active]');
    await expect(frame.locator('h1').first()).toBeVisible();

    // Navigation inside the demo stays inside the demo.
    await frame.locator('header nav a', { hasText: 'Services' }).first().click();
    await expect(frame.locator('h1').first()).toBeVisible();
    await expect(frame.locator('a[aria-current="page"]').first()).toContainText(/services/i);

    // The request form is neutralized: a valid submit shows the preview message and sends nothing.
    await frame.locator('a[href$="/quote"]').first().click();
    await frame.locator('#quote-name').fill('Demo Visitor');
    await frame.locator('#quote-email').fill('visitor@example.com');
    await frame
      .locator('#quote-message')
      .fill('Testing the preview form with a long enough message.');
    await frame.locator('input[name="consent"]').check();
    await frame.locator('select[name="requestType"]').selectOption({ index: 1 });
    await frame.locator('[data-submit]').click();
    await expect(frame.locator('.form-status')).toContainText(
      'This is a preview. Nothing was sent.',
    );
    await page.waitForTimeout(500);
    expect(writes).toEqual([]);
  });

  test('the real grit demo loads, its navigation works and its forms send nothing', async ({
    page,
    isMobile,
  }) => {
    test.skip(!demoExists('grit'), 'Demo build is not in public/demos yet.');
    test.skip(isMobile, 'The demo shows its menu button in a phone-sized frame.');
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.method() !== 'HEAD') {
        writes.push(`${request.method()} ${request.url()}`);
      }
    });
    await page.goto('/sandbox#grit/after');
    await stage(page).scrollIntoViewIfNeeded();
    await expect(viewport(page)).toHaveAttribute('data-state', 'ready');
    const frame = page.frameLocator('iframe[data-active]');
    await expect(frame.locator('h1').first()).toBeVisible();

    // Navigation inside the demo stays inside the demo and marks the current section.
    await frame.locator('nav[aria-label="Primary"] a', { hasText: 'Projects' }).first().click();
    await expect(frame.locator('nav[aria-label="Primary"] a[aria-current="page"]')).toContainText(
      'Projects',
    );

    // The inquiry form is neutralized: a valid submit shows the preview message and sends nothing.
    await frame.locator('a[href$="/contact"]').first().click();
    const form = frame.locator('form[data-grit-form="inquiry"]');
    await form.locator('#name').fill('Demo Visitor');
    await form.locator('#company').fill('Example Agency');
    await form.locator('#email').fill('visitor@example.com');
    await form.locator('select[name="projectType"]').selectOption({ index: 1 });
    await form.locator('#location').fill('Example County');
    await form.locator('#message').fill('Testing the preview form with a long enough message.');
    await form.locator('[data-form-submit]').click();
    await expect(form.locator('[data-form-success]')).toContainText(
      'This is a preview. Nothing was sent.',
    );
    await page.waitForTimeout(500);
    expect(writes).toEqual([]);
  });
});
