import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Request } from '@playwright/test';

/** Pages that exist in the production build (spec section 3 and 6b). */
export const PAGES = [
  { name: 'home', path: '/' },
  { name: 'privacy', path: '/privacy' },
  { name: 'thanks', path: '/thanks' },
  { name: '404', path: '/this-page-does-not-exist' },
] as const;

const TURNSTILE_SCRIPT = /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/;

/**
 * Replaces Cloudflare's Turnstile script with a stub that issues a token immediately, so tests
 * never touch the network and the "security check" is deterministic.
 */
export async function mockTurnstile(page: Page): Promise<void> {
  await page.route(TURNSTILE_SCRIPT, (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile = {
        render(container, options) {
          container.dataset.rendered = 'true';
          options.callback('e2e-token');
          return 'e2e-widget';
        },
        reset() {},
      };`,
    }),
  );
}

/** Records every request made to the endpoint and answers it with the given JSON. */
export async function mockApi(
  page: Page,
  path: '/api/contact' | '/api/checkout',
  status: number,
  json: unknown,
): Promise<Request[]> {
  const seen: Request[] = [];
  await page.route(`**${path}`, (route) => {
    seen.push(route.request());
    return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
  });
  return seen;
}

/** Scrolls the whole page once so scroll-driven reveals have run before measuring or screenshotting. */
export async function revealEverything(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.6, 200);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts.ready);
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth);
  expect(overflow.bodyScrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.clientWidth,
  );
}

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.slice(0, 4).map((node) => ({
      target: node.target,
      summary: node.failureSummary?.split('\n').slice(0, 3).join(' | '),
    })),
  }));
}

/** Resolves once the lazily loaded contact controller has mounted the (stubbed) check widget. */
export async function waitForContactReady(page: Page): Promise<void> {
  await page.locator('[data-contact-form]').scrollIntoViewIfNeeded();
  await page.locator('[data-turnstile][data-rendered="true"]').waitFor({ state: 'attached' });
}

/** The Worker rejects submissions faster than 3 s after page load (spec section 6, `elapsedMs`). */
export async function waitForMinimumFillTime(page: Page): Promise<void> {
  await page.waitForFunction(() => performance.now() > 3200);
}

/** Waits for finite animations and transitions only; decorative loops (float) never finish. */
export async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    ),
  );
}
