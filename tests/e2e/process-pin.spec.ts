import { expect, test, type Page } from '@playwright/test';

/** Geometry of the pinned timeline, read from the page. */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const section = document.querySelector<HTMLElement>('#process') as HTMLElement;
    const pin = section.querySelector('.pin') as HTMLElement;
    return {
      top: section.getBoundingClientRect().top + window.scrollY,
      extra: section.offsetHeight - pin.offsetHeight,
      height: section.offsetHeight,
      viewport: window.innerHeight,
    };
  });
}

const jump = (page: Page, y: number) =>
  page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
const lit = (page: Page) => page.locator('#process .step[data-lit]').count();
const stepsMiddle = (page: Page) =>
  page.locator('#process .steps').evaluate((node) => {
    const box = node.getBoundingClientRect();
    return box.top + box.height / 2;
  });

test.describe('desktop process timeline', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'The pinned timeline is desktop only.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
  });

  test('waits in the middle of the screen, then scrolling fills the timeline', async ({ page }) => {
    const { top, extra, viewport } = await geometry(page);
    expect(extra).toBeGreaterThan(viewport * 0.5);

    await jump(page, top);
    await expect.poll(() => lit(page)).toBe(1);
    expect(Math.abs((await stepsMiddle(page)) - viewport / 2)).toBeLessThan(viewport * 0.25);

    await jump(page, top + extra * 0.5);
    await expect.poll(() => lit(page)).toBe(3);
    // Still pinned in the middle while it fills.
    expect(Math.abs((await stepsMiddle(page)) - viewport / 2)).toBeLessThan(viewport * 0.25);
    await expect(page.locator('#process')).not.toHaveAttribute('data-pin-done', '');
  });

  test('at the end it releases, without the page jumping, and never pins again', async ({
    page,
  }) => {
    const { top, extra, viewport } = await geometry(page);
    await jump(page, top + extra - 2);
    await expect.poll(() => lit(page)).toBe(5);
    await expect(page.locator('#process')).not.toHaveAttribute('data-pin-done', '');
    const before = await stepsMiddle(page);

    await jump(page, top + extra + 1);
    await expect(page.locator('#process')).toHaveAttribute('data-pin-done', '');
    await expect.poll(() => lit(page)).toBe(5);
    // The reader sees the same thing: only the one scrolled pixel of difference.
    expect(Math.abs((await stepsMiddle(page)) - before)).toBeLessThan(20);
    expect((await geometry(page)).height).toBeLessThanOrEqual(viewport + 2);

    // Up and down again: no pinned length left, every stop stays lit.
    await jump(page, 0);
    const again = await geometry(page);
    await jump(page, again.top + 300);
    await jump(page, again.top + 3000);
    await jump(page, again.top);
    expect((await geometry(page)).height).toBeLessThanOrEqual(viewport + 2);
    expect(await lit(page)).toBe(5);
  });

  test('keeps the text readable the whole time', async ({ page }) => {
    const { top } = await geometry(page);
    await jump(page, top);
    for (const step of await page.locator('#process .step').all()) {
      await expect(step).toBeVisible();
      expect(Number(await step.evaluate((node) => getComputedStyle(node).opacity))).toBe(1);
    }
  });
});

test.describe('process timeline without the pin', () => {
  test('is a normal section on phones and shows every step', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phone project only.');
    await page.goto('/');
    const { height, viewport } = await geometry(page);
    expect(height).toBeLessThan(viewport * 3);
    await expect(page.locator('#process .step')).toHaveCount(5);
  });

  test('is a normal section with reduced motion', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop only.');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(
      await page.locator('#process .pin').evaluate((n) => getComputedStyle(n).position),
    ).not.toBe('sticky');
    expect(await lit(page)).toBe(5);
  });
});
