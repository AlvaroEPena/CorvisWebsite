import { expect, test } from '@playwright/test';

import { mockApi } from './support';

const STRIPE_URL = 'https://checkout.stripe.com/c/pay/cs_test_e2e';

test.describe('deposit checkout', () => {
  for (const id of ['launchpad', 'market-leader'] as const) {
    test(`the ${id} deposit button posts the package and follows the Stripe URL`, async ({
      page,
    }) => {
      const calls = await mockApi(page, '/api/checkout', 200, { ok: true, url: STRIPE_URL });
      // The real Stripe host is never contacted: the redirect target is answered locally.
      await page.route(STRIPE_URL, (route) =>
        route.fulfill({ contentType: 'text/html', body: '<title>stripe stub</title>' }),
      );
      await page.goto('/#pricing');

      await page.getByTestId(`deposit-button-${id}`).click();
      await page.waitForURL(STRIPE_URL);

      expect(calls).toHaveLength(1);
      expect(calls[0].postDataJSON()).toEqual({ package: id });
    });
  }

  test('a 503 shows a recoverable error and re-enables the button', async ({ page }) => {
    await mockApi(page, '/api/checkout', 503, { ok: false, error: 'checkout_unavailable' });
    await page.goto('/#pricing');
    const button = page.getByTestId('deposit-button-launchpad');
    const label = await button.textContent();

    await button.click();

    const error = page.getByTestId('checkout-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Online deposits are not available');
    await expect(button).toBeEnabled();
    await expect(button).toHaveText(label ?? '');
    await expect(page).toHaveURL(/localhost:4329\/#pricing$/);
  });

  test('a network failure shows a recoverable error', async ({ page }) => {
    await page.route('**/api/checkout', (route) => route.abort());
    await page.goto('/#pricing');
    await page.getByTestId('deposit-button-market-leader').click();
    await expect(page.getByTestId('checkout-error')).toContainText('could not reach the payment');
    await expect(page.getByTestId('deposit-button-market-leader')).toBeEnabled();
  });

  test('an untrusted redirect URL is refused instead of followed', async ({ page }) => {
    await mockApi(page, '/api/checkout', 200, { ok: true, url: 'https://evil.example/pay' });
    await page.goto('/#pricing');
    await page.getByTestId('deposit-button-launchpad').click();
    await expect(page.getByTestId('checkout-error')).toBeVisible();
    await expect(page).toHaveURL(/localhost:4329\/#pricing$/);
  });

  test('the managed infrastructure plan has no deposit button and routes to the contact form', async ({
    page,
  }) => {
    await page.goto('/#pricing');
    const managed = page.getByTestId('managed-plan');
    await expect(managed).toBeVisible();
    await expect(managed).toContainText('Fully Managed Digital Infrastructure');
    await expect(managed).toContainText('$149');
    await expect(managed).toContainText('Required with both packages');
    await expect(managed.locator('[data-deposit]')).toHaveCount(0);
    await expect(managed.getByRole('link', { name: 'Book a free consult' })).toHaveAttribute(
      'href',
      '#contact',
    );
    await expect(page.locator('[data-deposit]')).toHaveCount(2);
    await expect(page.getByTestId('deposit-button-care')).toHaveCount(0);
  });

  test('the packages show the owner prices, deposits and the 14-day footnote', async ({ page }) => {
    await page.goto('/#pricing');
    const launchpad = page.getByTestId('package-launchpad');
    const leader = page.getByTestId('package-market-leader');
    await expect(launchpad).toContainText('The Launchpad Foundation');
    await expect(launchpad).toContainText('$4,500');
    await expect(launchpad).toContainText('Deposit $2,250');
    await expect(launchpad).toContainText('14 days counts from kickoff');
    await expect(leader).toContainText('The Market Leader');
    await expect(leader).toContainText('$6,800');
    await expect(leader).toContainText('Deposit $3,400');
    await expect(leader).toContainText('instant email alerts');
  });
});
