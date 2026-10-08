import { expect, test, type Page } from '@playwright/test';

import { mockApi, mockTurnstile, waitForContactReady, waitForMinimumFillTime } from './support';

async function fillValidForm(page: Page): Promise<void> {
  await page.getByLabel(/Your name/).fill('Ada Lovelace');
  await page.getByLabel(/^Email/).fill('ada@example.com');
  await page.getByLabel(/Company/).fill('Analytical Engines');
  await page.getByLabel(/Current website/).fill('example.com');
  await page.getByLabel(/What do you need/).selectOption('redesign');
  await page.getByLabel(/Budget/).selectOption('3k-6k');
  await page.getByLabel(/Tell us about the project/).fill('We sell engines and our site is dated.');
  await page.getByRole('checkbox', { name: /I agree to Corvis/ }).check();
}

test.beforeEach(async ({ page }) => {
  await mockTurnstile(page);
});

test.describe('J2 valid submission', () => {
  test('sends the validated payload and shows the success state', async ({ page }) => {
    const calls = await mockApi(page, '/api/contact', 200, { ok: true });
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    await waitForMinimumFillTime(page);

    await page.getByRole('button', { name: 'Send request' }).click();

    const success = page.getByTestId('form-success');
    await expect(success).toBeVisible();
    await expect(success.getByRole('heading', { name: /Your request is in/ })).toBeVisible();
    await expect(success).toBeFocused();
    await expect(page.getByTestId('contact-form')).toBeHidden();

    expect(calls).toHaveLength(1);
    expect(calls[0].method()).toBe('POST');
    const body = calls[0].postDataJSON();
    expect(body).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Analytical Engines',
      website: 'https://example.com',
      service: 'redesign',
      budget: '3k-6k',
      consent: true,
      turnstileToken: 'e2e-token',
      nickname: '',
    });
    expect(body.elapsedMs).toBeGreaterThanOrEqual(3000);
  });

  test('a 500 keeps the form, keeps the input and explains', async ({ page }) => {
    await mockApi(page, '/api/contact', 500, { ok: false, error: 'send_failed' });
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    await waitForMinimumFillTime(page);
    await page.getByRole('button', { name: 'Send request' }).click();

    await expect(page.getByTestId('form-error')).toContainText('Something went wrong');
    await expect(page.getByTestId('form-success')).toBeHidden();
    await expect(page.getByLabel(/Your name/)).toHaveValue('Ada Lovelace');
    await expect(page.getByRole('button', { name: 'Send request' })).toBeEnabled();
  });

  test('a network failure shows a recoverable error', async ({ page }) => {
    await page.route('**/api/contact', (route) => route.abort());
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    await waitForMinimumFillTime(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByTestId('form-error')).toContainText('could not reach the server');
  });

  test('a 429 shows the rate limit notice', async ({ page }) => {
    await mockApi(page, '/api/contact', 429, { ok: false, error: 'rate_limited' });
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    await waitForMinimumFillTime(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByTestId('form-error')).toContainText('Too many messages');
  });

  test('server-side validation errors are mapped onto the fields', async ({ page }) => {
    await mockApi(page, '/api/contact', 400, {
      ok: false,
      error: 'validation',
      errors: { email: ['Enter a valid email address'] },
    });
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    await waitForMinimumFillTime(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#cf-email-error')).toHaveText('Enter a valid email address');
    await expect(page.getByLabel(/^Email/)).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('J3 invalid submission', () => {
  test('an empty submit shows accessible inline errors, focuses the first and sends nothing', async ({
    page,
  }) => {
    const calls = await mockApi(page, '/api/contact', 200, { ok: true });
    await page.goto('/');
    await waitForContactReady(page);
    await waitForMinimumFillTime(page);

    await page.getByRole('button', { name: 'Send request' }).click();

    const name = page.getByLabel(/Your name/);
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-describedby', /cf-name-error/);
    await expect(page.locator('#cf-name-error')).toBeVisible();
    await expect(page.locator('#cf-name-error')).not.toBeEmpty();

    for (const id of [
      'cf-email-error',
      'cf-service-error',
      'cf-message-error',
      'cf-consent-error',
    ]) {
      await expect(page.locator(`#${id}`), id).toBeVisible();
    }
    expect(calls).toHaveLength(0);
    await expect(page.getByTestId('form-success')).toBeHidden();
  });

  test('BUG: an invalid submit inside the first 3 s keeps the inline field errors', async ({
    page,
  }) => {
    const calls = await mockApi(page, '/api/contact', 200, { ok: true });
    await page.goto('/');
    await waitForContactReady(page);
    const elapsed = await page.evaluate(() => performance.now());
    test.skip(elapsed > 2900, 'Page was already older than the minimum fill time.');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByLabel(/Your name/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cf-name-error')).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  test('a malformed email and a short message are rejected, then pass once fixed', async ({
    page,
  }) => {
    const calls = await mockApi(page, '/api/contact', 200, { ok: true });
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    await page.getByLabel(/^Email/).fill('not-an-email');
    await page.getByLabel(/Tell us about the project/).fill('short');
    await waitForMinimumFillTime(page);

    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByLabel(/^Email/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(/Tell us about the project/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(calls).toHaveLength(0);

    await page.getByLabel(/^Email/).fill('ada@example.com');
    await page.getByLabel(/Tell us about the project/).fill('A long enough message to pass.');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByTestId('form-success')).toBeVisible();
    expect(calls).toHaveLength(1);
  });

  test('consent is required', async ({ page }) => {
    const calls = await mockApi(page, '/api/contact', 200, { ok: true });
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    await page.getByRole('checkbox', { name: /I agree to Corvis/ }).uncheck();
    await waitForMinimumFillTime(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#cf-consent-error')).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  test('submitting faster than 3 s shows the "too quick" notice and sends nothing', async ({
    page,
  }) => {
    const calls = await mockApi(page, '/api/contact', 200, { ok: true });
    await page.goto('/');
    await waitForContactReady(page);
    await fillValidForm(page);
    const elapsed = await page.evaluate(() => performance.now());
    test.skip(elapsed > 2900, 'Page was already older than the minimum fill time.');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByTestId('form-error')).toContainText('little quick');
    expect(calls).toHaveLength(0);
  });

  test('the honeypot is hidden from people and assistive tech', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[name="nickname"]')).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('.trap')).toHaveAttribute('aria-hidden', 'true');
  });

  test('a native Enter-submit never leaks the entries into the URL', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/Your name/).fill('Secret Person');
    await page.getByLabel(/^Email/).fill('secret@example.com');
    await page.getByLabel(/^Email/).press('Enter');
    await expect(page).toHaveURL(/localhost:4329\/(#.*)?$/);
    expect(page.url()).not.toMatch(/Secret|secret/);
  });
});
