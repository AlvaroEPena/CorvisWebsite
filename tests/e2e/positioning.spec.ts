import { expect, test } from '@playwright/test';

import { PAGES } from './support';

/** Owner copy rules (spec section 14): banned words, sanitized portfolio, motion fallbacks. */

const BANNED_WORDS = /template|framework|\bAI\b/i;
const REAL_BUSINESS =
  /zydeco|baton rouge|louisiana|\b225\b|348-5122|highlandia|lyon|\bHFS\b|wafb|wgno|usa today|house ?beautiful|daily advertiser|alder|finch/i;

test.describe('public copy rules', () => {
  for (const { name, path } of PAGES) {
    test(`${name} never uses template, framework or AI in visible text, meta or alt text`, async ({
      page,
    }) => {
      await page.goto(path);
      const text = await page.locator('body').innerText();
      expect(text).not.toMatch(BANNED_WORDS);

      const head = await page.evaluate(() =>
        [
          document.title,
          ...[...document.querySelectorAll('meta[content]')].map((m) => m.getAttribute('content')),
          ...[...document.querySelectorAll('script[type="application/ld+json"]')].map(
            (s) => s.textContent,
          ),
          ...[...document.querySelectorAll('img')].map((i) => i.getAttribute('alt')),
        ].join('\n'),
      );
      expect(head).not.toMatch(BANNED_WORDS);
      expect(text + ' ' + head).not.toMatch(REAL_BUSINESS);
    });
  }

  test('the home page has no phone-routing claim and no nightly-backup claim', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/routes? (inquiries|leads).*phone|nightly/i);
  });
});

test.describe('portfolio', () => {
  test('shows Refined Celebrations as a new design with no sandbox button', async ({ page }) => {
    await page.goto('/#work');
    const work = page.getByTestId('work');
    await expect(work.getByTestId('project-showcase')).toHaveCount(1);
    await expect(work).toContainText('Refined Celebrations & Co.');
    await expect(work).toContainText('Indianapolis');
    await expect(work.getByTestId('project-origin')).toContainText('built from scratch');
    await expect(work).not.toContainText(/saltwater|sample project/i);
    // The only way into the sandbox from the home page body is the button under the slider.
    await expect(work.locator('a[href*="sandbox"], button')).toHaveCount(0);
    await expect(page.locator('[data-testid="redesign-slider"] > div').first()).toHaveAttribute(
      'aria-hidden',
      'true',
    );

    const html = await work.evaluate((node) => node.outerHTML);
    expect(html).not.toMatch(REAL_BUSINESS);
    expect(html).not.toMatch(/href="https?:\/\/(?!corvis)/);
  });

  test('images set dimensions so the section cannot shift layout', async ({ page }) => {
    await page.goto('/#work');
    const missing = await page.evaluate(
      () =>
        [...document.querySelectorAll('#work img')].filter(
          (i) => !i.getAttribute('width') || !i.getAttribute('height'),
        ).length,
    );
    expect(missing).toBe(0);
  });
});

test.describe('motion fallbacks', () => {
  test('scroll-through mocks animate normally and stop under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const animationOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).animationName);

    // Off-screen mocks stay idle; each one starts once it is on screen.
    expect(await animationOf('#redesign .browse-track')).toBe('none');
    for (const section of ['#redesign', '#work']) {
      await page
        .locator(section + ' .browse-host')
        .first()
        .scrollIntoViewIfNeeded();
      await expect(page.locator(section + ' .browse-host').first()).toHaveAttribute(
        'data-in-view',
        '',
      );
      expect(await animationOf(section + ' .browse-track')).toBe('browse');
    }

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await animationOf('#redesign .browse-track')).toBe('none');
    expect(await animationOf('#work .browse-track')).toBe('none');
  });

  test('the dot-field starts after paint, and never under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-dotfield]')).not.toHaveAttribute('data-dotfield-live', '');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the dot-field goes live with full motion while the h1 is already visible', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-dotfield]')).toHaveAttribute('data-dotfield-live', '', {
      timeout: 8000,
    });
    await expect(page.locator('[data-dotfield]')).toHaveAttribute('aria-hidden', 'true');
  });
});
