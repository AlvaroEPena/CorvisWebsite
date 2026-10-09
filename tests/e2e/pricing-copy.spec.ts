import { expect, test } from '@playwright/test';

test.describe('pricing and proof copy', () => {
  test('shows plain numbers with no dollar sign anywhere on the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('package-launchpad')).toContainText('3,800');
    await expect(page.getByTestId('package-market-leader')).toContainText('4,940');
    await expect(page.getByTestId('managed-plan')).toContainText('274');
    expect(await page.locator('main').innerText()).not.toMatch(/\$\s?\d/);
  });

  test('has no deposit buttons and one consult button per package', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/pay project deposit/i)).toHaveCount(0);
    for (const id of ['launchpad', 'market-leader']) {
      await expect(
        page.getByTestId(`package-${id}`).getByRole('link', { name: 'Book a free consult' }),
      ).toHaveCount(1);
    }
    await expect(
      page.getByTestId('managed-plan').getByRole('link', { name: 'Book a free consult' }),
    ).toHaveCount(1);
  });

  test('keeps claims we cannot stand behind out of the page', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/spam protection/i);
    expect(text).not.toMatch(/hosting included|you own everything/i);
    await expect(page.getByTestId('pricing')).toContainText(
      'Information visibility on up to 10 service and location pages',
    );
    await expect(page.getByTestId('managed-plan')).toContainText('Everything in both packages');
    await expect(page.getByTestId('contact-form-panel')).toBeAttached();
    await expect(page.locator('#contact')).toContainText('as fast as 15 minutes');
  });
});

test.describe('process route', () => {
  test('all five steps and their text are visible without scrolling through animation', async ({
    page,
  }) => {
    await page.goto('/');
    const steps = page.locator('#process .step');
    await expect(steps).toHaveCount(5);
    for (const step of await steps.all()) {
      expect(Number(await step.evaluate((node) => getComputedStyle(node).opacity))).toBe(1);
    }
    await expect(steps.last()).toContainText('Manage and grow');
  });

  test('stops appear as the route scrolls into view and are all shown at the end', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Scroll-driven animation is asserted once, on desktop Chromium.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: view()'));
    test.skip(!supported, 'Scroll-driven animations are not available in this browser.');
    const orbs = page.locator('#process .orb');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const opacity = (index: number) =>
      orbs.nth(index).evaluate((node) => Number(getComputedStyle(node).opacity));
    expect(await opacity(4)).toBeLessThan(1);
    await page.locator('#process .step').last().scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 400));
    await expect.poll(() => opacity(4)).toBe(1);
  });
});
