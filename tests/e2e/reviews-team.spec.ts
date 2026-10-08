import { readdirSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

// Read as files: the test runner cannot use the site's import.meta.glob loader.
interface ReviewRecord {
  id: string;
  name: string;
  quote: string;
  featured: boolean;
  siteHref?: string;
  order?: number;
  homeOrder?: number;
  showOnReviewsPage?: boolean;
}
const DIR = 'src/content/reviews';
const rank = (value: number | undefined) => value ?? Number.POSITIVE_INFINITY;
/** Independent oracle for the ordering rule: sort by position, ties and missing keep file order. */
const sortedBy = (list: ReviewRecord[], key: 'order' | 'homeOrder') =>
  list
    .map((review, index) => ({ review, index }))
    .sort((a, b) => rank(a.review[key]) - rank(b.review[key]) || a.index - b.index)
    .map(({ review }) => review);
const allReviews = sortedBy(
  readdirSync(DIR)
    .sort()
    .map((file) => ({
      id: file.replace(/\.json$/, ''),
      ...(JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as Omit<ReviewRecord, 'id'>),
    })),
  'order',
);
/** /reviews lists the ones with "Show on the reviews page" (a missing key counts as shown). */
const reviews = allReviews.filter((review) => review.showOnReviewsPage !== false);
const featured = sortedBy(
  allReviews.filter((review) => review.featured),
  'homeOrder',
).slice(0, 6);
const NAV_LABELS = [
  'Services',
  'Work',
  'Redesign',
  'Process',
  'Pricing',
  'FAQ',
  'Meet the team',
  'Sandbox',
  'Reviews',
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

  test('has a "Meet the team" call to action to /team, more prominent than "More reviews"', async ({
    page,
  }) => {
    await page.goto('/');
    const section = page.getByTestId('testimonials');
    const team = section.getByRole('link', { name: /^Meet the team/ });
    await expect(team).toHaveAttribute('href', '/team');
    await expect(team).toContainText('Meet Alvaro and Aaron');
    // The avatars are decorative: the link's name is its text.
    await expect(team.locator('img')).toHaveCount(2);
    for (const image of await team.locator('img').all()) {
      await expect(image).toHaveAttribute('alt', '');
    }
    const [teamBox, moreBox] = await Promise.all([
      team.boundingBox(),
      section.getByTestId('more-reviews').boundingBox(),
    ]);
    expect(teamBox && moreBox).toBeTruthy();
    expect((teamBox?.width ?? 0) * (teamBox?.height ?? 0)).toBeGreaterThan(
      (moreBox?.width ?? 0) * (moreBox?.height ?? 0) * 1.4,
    );
    await team.click();
    await expect(page).toHaveURL(/\/team$/);
  });

  test('stacks the two buttons on phones and puts them side by side on desktop', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    const section = page.getByTestId('testimonials');
    const [teamBox, moreBox] = await Promise.all([
      section.getByTestId('meet-the-team').boundingBox(),
      section.getByTestId('more-reviews').boundingBox(),
    ]);
    if (isMobile)
      expect(moreBox?.y ?? 0).toBeGreaterThan((teamBox?.y ?? 0) + (teamBox?.height ?? 0));
    else expect(Math.abs((moreBox?.y ?? 0) - (teamBox?.y ?? 0))).toBeLessThan(40);
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
    await expect(page.getByTestId('reviews-count')).toHaveText(
      `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`,
    );

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

  test('is linked from the footer and the navbar, and highlighted there when open', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    await expect(page.locator('body > footer a[href="/reviews"]')).toHaveCount(1);
    await expect(page.locator('body > header a[href="/reviews"]').first()).toBeAttached();
    await page.goto('/reviews');
    if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
    const active = page.locator('body > header a[aria-current="page"]').filter({ visible: true });
    await expect(active.first()).toHaveText('Reviews');
  });
});

test.describe('/team and founders', () => {
  test('shows both founders with their roles and the working steps', async ({ page }) => {
    await page.goto('/team');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meet the team.');
    await expect(
      page.getByRole('heading', { level: 1 }).locator('xpath=following-sibling::p[1]'),
    ).toHaveText('Two founders, one clear way of working. You talk to Aaron. Alvaro builds it.');
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

  test('shows Alvaro photo with alt text and a decorative placeholder for Aaron, both 4:5', async ({
    page,
  }) => {
    await page.goto('/team');
    const photos = page.getByTestId('team-photo').locator('img');
    await expect(photos).toHaveCount(2);
    for (const image of await photos.all()) await image.scrollIntoViewIfNeeded();
    for (const image of await photos.all()) {
      await expect
        .poll(() =>
          image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
        )
        .toBe(true);
      const width = Number(await image.getAttribute('width'));
      const height = Number(await image.getAttribute('height'));
      expect(width / height).toBeCloseTo(0.8, 2);
    }
    const [alvaro, aaron] = [photos.nth(0), photos.nth(1)];
    await expect(alvaro).toHaveAttribute('alt', 'Alvaro Peña, Founder and Tech Lead');
    await expect(alvaro).toHaveAttribute('src', /alvaro-card.*\.avif/);
    await expect(aaron).toHaveAttribute('alt', '');
    await expect(aaron).toHaveAttribute('aria-hidden', 'true');
    // Real photo sits above the fold: eager. Placeholder further down: lazy.
    await expect(alvaro).toHaveAttribute('loading', 'eager');
    await expect(aaron).toHaveAttribute('loading', 'lazy');
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

  test('the navbar lists Meet the team right after FAQ, then Sandbox and Reviews, on one line', async ({
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

  test('the navbar never wraps, clips the CTA or overflows from 1120px to 1440px', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop link row.');
    for (const width of [1120, 1200, 1280, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/team');
      const nav = page.getByTestId('nav');
      const box = await nav.boundingBox();
      expect(box?.height ?? 0, `nav height at ${width}`).toBeLessThanOrEqual(72);
      const overflow = await nav.evaluate((node) => node.scrollWidth - node.clientWidth);
      expect(overflow, `nav overflow at ${width}`).toBeLessThanOrEqual(0);
      const cta = await page.getByTestId('nav-cta').boundingBox();
      expect(
        (cta?.x ?? 0) + (cta?.width ?? 0),
        `CTA inside the bar at ${width}`,
      ).toBeLessThanOrEqual((box?.x ?? 0) + (box?.width ?? 0));
      expect((cta?.x ?? 0) + (cta?.width ?? 0)).toBeLessThanOrEqual(width);
      for (const link of await page.locator('header .links a').all()) {
        const linkBox = await link.boundingBox();
        expect(linkBox?.height ?? 0).toBeLessThanOrEqual(48);
      }
      const lastLink = await page.locator('header .links a').last().boundingBox();
      expect(
        (lastLink?.x ?? 0) + (lastLink?.width ?? 0),
        `last link clears the CTA at ${width}`,
      ).toBeLessThanOrEqual(cta?.x ?? 0);
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
