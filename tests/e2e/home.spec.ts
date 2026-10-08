import { expect, test } from '@playwright/test';

import { mockTurnstile, revealEverything } from './support';

test.describe('J1 hero to contact', () => {
  test('hero shows the slogan and the CTA scrolls to #contact', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toContainText('Core');
    await expect(h1).toContainText('Vision');

    await page.getByTestId('hero-cta').click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('#contact')).toBeInViewport();
    await expect(
      page.getByRole('heading', { level: 2, name: /Book a free consult/ }),
    ).toBeVisible();
  });
});

test.describe('J5 FAQ and navigation anchors', () => {
  test('FAQ items open and close with the keyboard', async ({ page }) => {
    await page.goto('/#faq');
    const first = page.locator('#faq details').first();
    await first.locator('summary').focus();
    await expect(first).not.toHaveAttribute('open', '');
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator('p')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(first).not.toHaveAttribute('open', '');
  });

  test('desktop nav links scroll to their sections', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop navigation only; the mobile menu is covered in J6.');
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    for (const [label, id] of [
      ['Services', 'services'],
      ['Work', 'work'],
      ['Redesign', 'redesign'],
      ['Process', 'process'],
      ['Pricing', 'pricing'],
      ['FAQ', 'faq'],
    ] as const) {
      await nav.getByRole('link', { name: label, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });
});

test.describe('home content', () => {
  test('every section from spec section 3 is present in order', async ({ page }) => {
    await page.goto('/');
    const ids = await page
      .locator('main > section[id]')
      .evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(ids).toEqual([
      'hero',
      'proof',
      'services',
      'work',
      'redesign',
      'process',
      'pricing',
      'testimonials',
      'faq',
      'contact',
    ]);
  });

  test('there is exactly one h1 and every image has alt text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('img:not([alt])')).toHaveCount(0);
  });

  test('content is present without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://localhost:4329/');
    for (const id of ['work', 'pricing', 'testimonials', 'faq']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: /Sites that sound like/ })).toBeVisible();
    await context.close();
  });

  test('no console errors, page errors or failed requests during a full scroll', async ({
    page,
  }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) =>
      problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`),
    );
    page.on('response', (response) => {
      if (response.status() >= 400) problems.push(`http ${response.status()}: ${response.url()}`);
    });
    await mockTurnstile(page);
    await page.goto('/');
    await revealEverything(page);
    expect(problems).toEqual([]);
  });
});
