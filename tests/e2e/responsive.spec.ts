import { expect, test } from '@playwright/test';

import { expectNoHorizontalScroll, PAGES, revealEverything } from './support';

const WIDTHS = [320, 390, 768, 1024, 1100, 1120, 1280, 1440] as const;
/** Navigation switches from the menu button to the link row at 70rem (Nav.astro). */
const DESKTOP_NAV_MIN_WIDTH = 1120;

// Viewport is set per test, so one project is enough; the other two would repeat the work.
test.describe('J6 responsive layout', () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chromium only.');
    test.skip(
      testInfo.project.name !== 'desktop',
      'Viewport sweep runs once, in the desktop project.',
    );
  });

  for (const width of WIDTHS) {
    for (const { name, path } of PAGES) {
      test(`${name} has no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await revealEverything(page);
        await expectNoHorizontalScroll(page);
      });
    }

    test(`navigation is usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const nav = page.getByRole('navigation', { name: 'Primary' });
      if (width >= DESKTOP_NAV_MIN_WIDTH) {
        await expect(nav.getByRole('link', { name: 'Pricing', exact: true }).first()).toBeVisible();
        await expect(nav.getByRole('button', { name: /menu/i })).toBeHidden();
      } else {
        await expect(nav.getByRole('button', { name: 'Open menu' })).toBeVisible();
        await nav.getByRole('button', { name: 'Open menu' }).click();
        await nav.getByRole('link', { name: 'Pricing', exact: true }).last().click();
        await expect(page).toHaveURL(/#pricing$/);
        await expect(page.locator('#pricing')).toBeInViewport();
      }
    });
  }

  test('the form and deposit buttons fit at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    for (const locator of [
      page.getByTestId('contact-form-panel'),
      page.getByTestId('deposit-button-launchpad'),
      page.getByTestId('deposit-button-market-leader'),
    ]) {
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.x ?? -1) >= 0).toBe(true);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    }
  });
});

test.describe('J6 mobile menu', () => {
  test('collapses to a menu button; open, navigate and close via Escape', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile project only.');
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    const toggle = nav.getByRole('button', { name: 'Open menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.locator('ul.links')).toBeHidden();

    await toggle.click();
    const close = nav.getByRole('button', { name: 'Close menu' });
    await expect(close).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.locator('#nav-menu')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(nav.getByRole('button', { name: 'Open menu' })).toBeFocused();
    await expect(nav.locator('#nav-menu')).toBeHidden();

    await toggle.click();
    await nav.locator('#nav-menu').getByRole('link', { name: 'FAQ' }).click();
    await expect(page).toHaveURL(/#faq$/);
    await expect(nav.locator('#nav-menu')).toBeHidden();
    await expect(page.locator('#faq')).toBeInViewport();
  });

  test('no horizontal scroll and the form is usable on the phone viewport', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile project only.');
    await page.goto('/');
    await revealEverything(page);
    await expectNoHorizontalScroll(page);
    await page.getByTestId('nav-cta').or(page.locator('#nav-menu .btn')).first().waitFor({
      state: 'attached',
    });
    await page.locator('#contact').scrollIntoViewIfNeeded();
    for (const label of [/Your name/, /^Email/, /Tell us about the project/]) {
      const field = page.getByLabel(label);
      await field.scrollIntoViewIfNeeded();
      const box = await field.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    const submit = page.getByRole('button', { name: 'Send request' });
    await submit.scrollIntoViewIfNeeded();
    expect((await submit.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('tap targets in the open menu are at least 44px', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile project only.');
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const links = page.locator('#nav-menu a');
    const count = await links.count();
    expect(count).toBeGreaterThan(5);
    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box?.height ?? 0, `menu item ${index}`).toBeGreaterThanOrEqual(44);
    }
  });
});
