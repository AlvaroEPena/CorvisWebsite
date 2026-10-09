import { expect, test } from '@playwright/test';

import {
  axeViolations,
  mockTurnstile,
  PAGES,
  revealEverything,
  waitForContactReady,
  waitForMinimumFillTime,
} from './support';

// Runs in every Playwright project: mobile (Pixel 7), desktop, and reduced-motion.
test.describe('axe WCAG 2.2 AA', () => {
  for (const { name, path } of PAGES) {
    test(`${name} has no violations`, async ({ page }) => {
      await mockTurnstile(page);
      await page.goto(path);
      await revealEverything(page);
      expect(await axeViolations(page)).toEqual([]);
    });
  }

  test('home has no violations with the mobile menu open', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The menu only exists below the desktop breakpoint.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    expect(await axeViolations(page)).toEqual([]);
  });

  test('home has no violations with form errors showing', async ({ page }) => {
    await mockTurnstile(page);
    await page.goto('/');
    await waitForContactReady(page);
    await waitForMinimumFillTime(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#cf-name-error')).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test('home has no violations with an FAQ item open', async ({ page }) => {
    await page.goto('/');
    await page.locator('#faq summary').first().click();
    expect(await axeViolations(page)).toEqual([]);
  });
});
