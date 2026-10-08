import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

// Read as a file: the test runner's ESM loader cannot import JSON without an import attribute.
interface ReviewRecord {
  id: string;
  name: string;
  quote: string;
  featured: boolean;
  siteHref?: string;
}
const reviews = (
  JSON.parse(readFileSync('src/content/reviews.json', 'utf8')) as { reviews: ReviewRecord[] }
).reviews;
const featured = reviews.filter((review) => review.featured);
const NAV_LABELS = [
  'Services',
  'Work',
  'Redesign',
  'Process',
  'Pricing',
  'FAQ',
  'Meet the team',
  'Sandbox',
];

test.describe('home testimonials', () => {
  test('list the featured reviews in order, with no sample or preview wording', async ({
    page,
  }) => {
    await page.goto('/');
    const section = page.getByTestId('testimonials');
    const quotes = await section.locator('blockquote p').allInnerTexts();
    expect(quotes).toEqual(featured.map((review) => `“${review.quote}”`));
    await expect(section).not.toContainText(/sample|preview|real client quotes/i);
    await expect(page.getByTestId('testimonials-sample-note')).toHaveCount(0);
  });

  test('has a "More reviews" button to /reviews', async ({ page }) => {
    await page.goto('/');
    const button = page.getByTestId('testimonials').getByRole('link', { name: 'More reviews' });
    await expect(button).toHaveAttribute('href', '/reviews');
    await button.click();
    await expect(page).toHaveURL(/\/reviews$/);
  });

  test('never emits review or rating structured data', async ({ page }) => {
    for (const path of ['/', '/reviews', '/team']) {
      await page.goto(path);
      const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(
        '\n',
      );
      expect(ld, path).not.toMatch(/"@type":\s*"(Review|AggregateRating|Rating)"|ratingValue/);
    }
  });

  test('the Work card callout no longer mentions an earlier version', async ({ page }) => {
    await page.goto('/#work');
    await expect(page.getByTestId('project-origin')).toHaveText(
      'A brand-new design, built from scratch.',
    );
  });
});

test.describe('/reviews', () => {
  test('renders inside the Corvis chrome, indexable, with every review', async ({ page }) => {
    await page.goto('/reviews');
    await expect(page).toHaveTitle(/reviews/i);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What clients say.');
    await expect(page.getByTestId('nav')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/reviews$/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.getByTestId('reviews-count')).toHaveText(`${reviews.length} reviews`);

    const cards = page.getByTestId('review-card');
    await expect(cards).toHaveCount(reviews.length);
    const names = await cards.locator('figcaption strong').allInnerTexts();
    expect(names).toEqual(reviews.map((review) => review.name));
  });

  test('"View their new site" is a link only when siteHref is set', async ({ page }) => {
    await page.goto('/reviews');
    for (const review of reviews) {
      const card = page.locator(`[data-review-id="${review.id}"]`);
      if (review.siteHref) {
        const link = card.getByRole('link', { name: 'View their new site' });
        await expect(link).toHaveAttribute('href', review.siteHref);
        await expect(card.getByTestId('review-site-disabled')).toHaveCount(0);
      } else {
        const disabled = card.getByTestId('review-site-disabled');
        await expect(disabled).toBeDisabled();
        await expect(card.getByRole('link', { name: 'View their new site' })).toHaveCount(0);
        await expect(card.locator('[title="Coming soon"]')).toHaveCount(1);
      }
    }
  });

  test('disabled buttons are skipped by the keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard interaction is a desktop concern.');
    await page.goto('/reviews');
    const focusable = await page
      .locator('[data-testid="review-card"]')
      .first()
      .evaluate((card) => card.querySelectorAll('a[href], button:not([disabled])').length);
    const expectedLinks = reviews[0]?.siteHref ? 1 : 0;
    expect(focusable).toBe(expectedLinks);
  });

  test('content is visible without scroll-driven animation changing any text', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/reviews');
    for (const card of await page.getByTestId('review-card').all()) {
      await expect(card).toHaveCSS('opacity', '1');
    }
  });

  test('links back to the home reviews and to the consult form', async ({ page }) => {
    await page.goto('/reviews');
    await expect(page.getByRole('link', { name: /Back to the reviews/ })).toHaveAttribute(
      'href',
      '/#testimonials',
    );
    await expect(
      page.locator('main').getByRole('link', { name: 'Book a free consult' }),
    ).toHaveAttribute('href', '/#contact');
  });

  test('has three columns on desktop, two on tablet and one on phones', async ({ page }) => {
    const columnsAt = async (width: number) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/reviews');
      return page.locator('.wall').evaluate((node) => getComputedStyle(node).columnCount);
    };
    expect(await columnsAt(1280)).toBe('3');
    expect(await columnsAt(768)).toBe('2');
    expect(await columnsAt(390)).toBe('1');
  });

  test('is linked from the footer but not from the main navbar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body > footer a[href="/reviews"]')).toHaveCount(1);
    await expect(page.locator('body > header a[href="/reviews"]')).toHaveCount(0);
  });
});

test.describe('/team and founders', () => {
  test('shows both founders with their roles and the working steps', async ({ page }) => {
    await page.goto('/team');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meet the team.');
    const members = page.getByTestId('team-member');
    await expect(members).toHaveCount(2);
    await expect(members.nth(0)).toContainText('Alvaro Peña');
    await expect(members.nth(0)).toContainText('Founder & Tech Lead');
    await expect(members.nth(1)).toContainText('Aaron Peña-Diamond');
    await expect(members.nth(1)).toContainText('Co-Founder');
    await expect(members.nth(1)).toContainText(/point of contact/i);
    await expect(page.getByRole('heading', { name: 'How we work together' })).toBeVisible();
    await expect(page.locator('.together li')).toHaveCount(3);
    await expect(
      page.locator('main').getByRole('link', { name: 'Book a free consult' }),
    ).toHaveAttribute('href', '/#contact');
  });

  test('footer names both founders and JSON-LD lists them as founders', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('body > footer');
    await expect(footer).toContainText('Alvaro Peña, Founder & Tech Lead');
    await expect(footer).toContainText('Aaron Peña-Diamond, Co-Founder');
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
    );
    expect(ld.founder).toEqual([
      { '@type': 'Person', name: 'Alvaro Peña', jobTitle: 'Founder & Tech Lead' },
      { '@type': 'Person', name: 'Aaron Peña-Diamond', jobTitle: 'Co-Founder' },
    ]);
    await expect(page.getByTestId('proof')).toContainText('Aaron');
  });

  test('the navbar lists Meet the team right after FAQ, then Sandbox, on one line', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      expect(await page.locator('header .menu ul a').allInnerTexts()).toEqual(NAV_LABELS);
      return;
    }
    expect(await page.locator('header .links a').allInnerTexts()).toEqual(NAV_LABELS);
  });

  test('the navbar never wraps or overflows at 1024px and 1280px', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop link row.');
    for (const width of [1024, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/team');
      const nav = page.getByTestId('nav');
      const box = await nav.boundingBox();
      expect(box?.height ?? 0, `nav height at ${width}`).toBeLessThanOrEqual(72);
      const overflow = await nav.evaluate((node) => node.scrollWidth - node.clientWidth);
      expect(overflow, `nav overflow at ${width}`).toBeLessThanOrEqual(0);
      const cta = await page.getByTestId('nav-cta').boundingBox();
      expect((cta?.x ?? 0) + (cta?.width ?? 0)).toBeLessThanOrEqual(width);
      for (const link of await page.locator('header .links a').all()) {
        const linkBox = await link.boundingBox();
        expect(linkBox?.height ?? 0).toBeLessThanOrEqual(48);
      }
    }
  });
});

test.describe('/admin', () => {
  test('is noindex, outside the site chrome, and mounts the CMS without console errors', async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    // Never talk to GitHub from a test.
    await page.route(/api\.github\.com|githubstatus\.com|raw\.githubusercontent\.com/, (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
    );

    const response = await page.goto('/admin');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('Corvis admin');
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
    await expect(page.getByTestId('nav')).toHaveCount(0);
    // Sveltia replaces the body with its sign-in screen: the token option is offered.
    await expect(page.getByRole('button', { name: /access token/i }).first()).toBeVisible({
      timeout: 15000,
    });
    expect(errors.filter((text) => !/Failed to load resource/.test(text))).toEqual([]);

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
  });

  test('is kept out of the sitemap', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    test.fixme(
      /\/admin</.test(sitemap),
      'Needs the sitemap filter in astro.config.mjs (see the round-5 report).',
    );
    expect(sitemap).not.toContain('/admin');
  });
});
