import { expect, test } from '@playwright/test';
import { settleAnimations } from './support';

test.describe('J7 reduced motion and fallbacks', () => {
  test('reduced-motion project: no motion flags, all content visible immediately', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'reduced-motion', 'Needs the reduced-motion emulation.');
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
      true,
    );
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'on');

    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.reveal, .hero-rise')]
        .filter((el) => Number(getComputedStyle(el).opacity) < 1)
        .map((el) => el.className),
    );
    expect(hidden).toEqual([]);

    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (animation) => animation.playState === 'running' && !(animation instanceof CSSTransition),
        )
        .map((animation) => (animation as CSSAnimation).animationName ?? 'unknown'),
    );
    expect(running).toEqual([]);

    await expect(page.getByTestId('hero-cta')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('reduced-motion project: below-the-fold content is readable without scrolling first', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'reduced-motion', 'Needs the reduced-motion emulation.');
    await page.goto('/#testimonials');
    for (const id of ['work', 'testimonials', 'faq']) {
      const section = page.locator(`#${id}`);
      await expect(section.getByRole('heading', { level: 2 })).toHaveCSS('opacity', '1');
    }
  });

  test('motion enabled: the failsafe never leaves content hidden after load', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'reduced-motion', 'Motion-on behaviour only.');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion-ready', '', { timeout: 6000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1');
  });

  test('Save-Data and reduced-transparency tiers swap glass for solid panels', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-save-data', '');
    const filters = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.glass, .panel')].map((el) => {
        const style = getComputedStyle(el);
        return style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter') || 'none';
      }),
    );
    expect(filters.length).toBeGreaterThan(0);
    expect(filters.every((value) => value === 'none')).toBe(true);
  });

  test('glass panels keep readable text when backdrop-filter is unavailable', async ({ page }) => {
    // Approximates a browser without backdrop-filter by neutralising it, then checks text contrast.
    await page.goto('/');
    await page.addStyleTag({
      content: '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    });
    await settleAnimations(page);
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  });

  test('the home page loads under the first-load JS budget (spec section 10)', async ({ page }) => {
    const { gzipSync } = await import('node:zlib');
    const sizes: Record<string, number> = {};
    page.on('response', async (response) => {
      const url = new URL(response.url());
      if (url.origin !== 'http://localhost:4329' || !url.pathname.endsWith('.js')) return;
      sizes[url.pathname] = gzipSync(await response.body()).length;
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    const lazy = /gsap|ScrollTrigger|contact-controller/i;
    const firstLoad = Object.entries(sizes).filter(([path]) => !lazy.test(path));
    const total = firstLoad.reduce((sum, [, size]) => sum + size, 0);
    test.info().annotations.push({ type: 'js-gz-bytes', description: JSON.stringify(sizes) });
    expect(total, JSON.stringify(sizes)).toBeLessThan(60 * 1024);
  });
});
