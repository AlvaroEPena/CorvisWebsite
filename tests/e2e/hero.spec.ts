import { expect, type Page, test } from '@playwright/test';

import { proofStats } from '../../src/content/proof';
import { revealEverything } from './support';

const HERO_ELEMENTS = [
  '#hero-title',
  '.hero .eyebrow',
  '.hero .lead',
  '.hero .actions',
  '.hero .stage',
  '.hero [data-hero-mark]',
  '.hero .card-core',
  '.hero .object',
];

const LINK_LABELS = ['Services', 'Work', 'Process', 'Pricing', 'FAQ', 'Meet the team', 'Sandbox'];

/** Product of opacity along the ancestor chain: 1 means fully visible. */
function effectiveOpacity(page: Page, selector: string): Promise<number> {
  return page.evaluate((query) => {
    let opacity = 1;
    for (let node = document.querySelector<HTMLElement>(query); node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    return opacity;
  }, selector);
}

test.describe('navigation order', () => {
  test('desktop navbar ends with Sandbox', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The link row only exists on desktop; the mobile menu is checked below.');
    await page.goto('/');
    expect(await page.locator('header .links a').allInnerTexts()).toEqual(LINK_LABELS);
  });

  test('mobile menu ends with Sandbox', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The menu only exists below the desktop breakpoint.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    expect(await page.locator('header .menu ul a').allInnerTexts()).toEqual(LINK_LABELS);
  });

  test('the footer keeps its own order', async ({ page }) => {
    await page.goto('/');
    const labels = await page.locator('body > footer nav a').allInnerTexts();
    expect(labels.slice(0, 7)).toEqual([
      'Services',
      'Work',
      'Sandbox',
      'Process',
      'Pricing',
      'FAQ',
      'Meet the team',
    ]);
  });
});

test.describe('hero appears immediately', () => {
  test('every hero element is fully visible shortly after load, with no JS gate', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // The only motion allowed is a CSS entrance of 400 ms or less.
    await page.waitForTimeout(900);
    for (const selector of HERO_ELEMENTS) {
      expect(await effectiveOpacity(page, selector), selector).toBeGreaterThan(0.99);
    }
    await expect(page.locator('[data-hero-obj]')).toHaveCount(0);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the whole hero, including the logo, is visible', async ({ page }) => {
      await page.goto('/');
      for (const selector of HERO_ELEMENTS) {
        await expect(page.locator(selector).first(), selector).toBeVisible();
      }
      await page.waitForTimeout(900);
      for (const selector of HERO_ELEMENTS) {
        expect(await effectiveOpacity(page, selector), selector).toBeGreaterThan(0.99);
      }
    });
  });

  test('the headline is never animated, so it stays the first thing painted', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hero-title')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('#hero-title')).toHaveCSS('opacity', '1');
  });
});

test.describe('hero logo', () => {
  test('is a labelled image built from the mark: ring, chevron and dot', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('#hero').getByRole('img', { name: 'Corvis logo' });
    await expect(logo).toBeVisible();
    await expect(logo.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(logo.locator('.hm-ring')).toBeVisible();
    await expect(logo.locator('.hm-chevron-slide')).toBeVisible();
    await expect(logo.locator('.hm-dot')).toBeVisible();
    // Sized sensibly inside the panel: wide enough to read, never wider than the panel.
    const box = await logo.boundingBox();
    const stage = await page.locator('.hero .stage').boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(200);
    expect(box?.width ?? 0).toBeLessThanOrEqual(stage?.width ?? 0);
  });

  test('the old glowing orb is gone from the hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero .core-orb')).toHaveCount(0);
  });

  test('animates with full motion and is static under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('.hm-float')).toHaveCSS('animation-name', /hm-float/);
    // The light sweep is an SVG gradient animation started by script (crisp vector, no masked layer).
    await expect(page.locator('[data-hero-mark]')).toHaveAttribute('data-sweep', 'on');
    await expect(page.locator('.hm-sweep')).toHaveCount(1);
    await expect(page.locator('svg mask')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const selector of ['.hm-float', '.hm-draw', '.hm-dot-pop', '.hm-halo']) {
      await expect(page.locator(selector).first()).toHaveCSS('animation-name', 'none');
    }
    await expect(page.locator('.hm-ring')).toBeVisible();
  });

  test('never starts the light sweep under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('[data-hero-mark]')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-hero-mark]')).not.toHaveAttribute('data-sweep', 'on');
  });

  test('pauses its loops while scrolled out of view', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Runs in the desktop projects.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('[data-hero-mark]')).not.toHaveAttribute('data-paused', '');
    const sweepPaused = () =>
      page
        .locator('[data-hero-mark] svg')
        .evaluate((svg) => (svg as SVGSVGElement).animationsPaused());
    expect(await sweepPaused()).toBe(false);
    await page.locator('#faq').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-hero-mark]')).toHaveAttribute('data-paused', '');
    expect(await sweepPaused()).toBe(true);
  });

  test('tilts toward the pointer on desktop', async ({ page, isMobile, browserName }) => {
    test.skip(isMobile || browserName !== 'chromium', 'Fine-pointer behavior.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const mark = page.locator('[data-hero-mark]');
    await expect(mark).toBeVisible();
    await page.mouse.move(1400, 120);
    await expect
      .poll(() => mark.evaluate((el) => (el as HTMLElement).style.getPropertyValue('--ry')))
      .not.toBe('');
    const ry = await mark.evaluate((el) =>
      parseFloat((el as HTMLElement).style.getPropertyValue('--ry')),
    );
    expect(ry).toBeGreaterThan(0);
  });
});

test.describe('proof numbers are static', () => {
  const finalValues = proofStats.map((stat) => `${stat.value}${stat.suffix}`);
  const renderedValues = (page: Page) => page.locator('[data-testid="proof"] dd').allInnerTexts();

  test('show the final values immediately, while scrolling and after', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(finalValues).toEqual(['14', '10', '95+', '1']);
    expect(await renderedValues(page)).toEqual(finalValues);

    const seen = new Set<string>();
    for (const fraction of [0.05, 0.2, 0.4, 0.6, 0.8, 1]) {
      await page.evaluate((target) => {
        const element = document.querySelector('[data-testid="proof"]');
        if (!element) return;
        const top = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top - window.innerHeight * (1 - target));
      }, fraction);
      await page.waitForTimeout(120);
      seen.add(JSON.stringify(await renderedValues(page)));
    }
    await revealEverything(page);
    seen.add(JSON.stringify(await renderedValues(page)));
    expect([...seen]).toEqual([JSON.stringify(finalValues)]);
  });

  test('carry no counter animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('[data-testid="proof"] .count')).toHaveCount(0);
    const animated = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="proof"] dd, [data-testid="proof"] dd *')].some(
        (node) => {
          const style = getComputedStyle(node);
          return style.animationName !== 'none' || style.counterReset !== 'none';
        },
      ),
    );
    expect(animated).toBe(false);
  });
});
