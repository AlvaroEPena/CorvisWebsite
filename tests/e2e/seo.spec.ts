import { expect, test } from '@playwright/test';

import { reviewsOn } from './support';

/**
 * Search basics on every public page (the ones in the sitemap), checked on the built site:
 * a unique title, a sensible description, one h1, language, a self-referencing canonical, a social
 * image that really loads, no noindex, alt text on every image and well-formed structured data.
 */
const TITLE_MAX = 65;
const DESCRIPTION_MIN = 70;
const DESCRIPTION_MAX = 160;

async function sitemapPaths(request: import('@playwright/test').APIRequestContext) {
  const index = await (await request.get('/sitemap-index.xml')).text();
  const files = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1] ?? '').pathname,
  );
  const paths = new Set<string>();
  for (const file of files) {
    const xml = await (await request.get(file)).text();
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      paths.add(new URL(match[1] ?? '').pathname.replace(/\/$/, '') || '/');
    }
  }
  return [...paths].sort();
}

test.describe('search basics on every public page', () => {
  test.skip(({ isMobile }) => isMobile, 'Markup checks, done once on desktop.');

  test('the sitemap lists the public pages and nothing private', async ({ request }) => {
    const paths = await sitemapPaths(request);
    expect(paths).toEqual(expect.arrayContaining(['/', '/sandbox', '/team']));
    // The reviews page is only built, and only listed, while reviews are switched on.
    expect(paths.includes('/reviews')).toBe(reviewsOn);
    for (const path of paths) {
      expect(path).not.toMatch(/^\/(admin|demos|thanks|404)/);
    }
  });

  test('every page has the basics', async ({ page, request }) => {
    const paths = await sitemapPaths(request);
    const titles = new Map<string, string>();

    for (const path of paths) {
      await page.goto(path);
      const label = `page ${path}`;

      const title = await page.title();
      expect(title.length, `${label} title`).toBeGreaterThan(10);
      expect(title.length, `${label} title length`).toBeLessThanOrEqual(TITLE_MAX);
      expect(titles.has(title), `${label} title is unique (also on ${titles.get(title)})`).toBe(
        false,
      );
      titles.set(title, path);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0, `${label} description length`).toBeGreaterThanOrEqual(
        DESCRIPTION_MIN,
      );
      expect(description?.length ?? 0, `${label} description length`).toBeLessThanOrEqual(
        DESCRIPTION_MAX,
      );

      await expect(page.locator('html'), label).toHaveAttribute('lang', 'en');
      await expect(page.locator('h1'), `${label} has one h1`).toHaveCount(1);
      await expect(page.locator('meta[name="robots"]'), `${label} is indexable`).toHaveCount(0);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(
        new URL(canonical ?? '').pathname.replace(/\/$/, '') || '/',
        `${label} canonical`,
      ).toBe(path);
      expect(await page.locator('link[rel="canonical"]').count(), `${label} one canonical`).toBe(1);
      await expect(page.locator('meta[property="og:url"]'), label).toHaveAttribute(
        'content',
        canonical ?? '',
      );
      await expect(page.locator('meta[property="og:title"]'), label).toHaveAttribute(
        'content',
        title,
      );
      await expect(page.locator('meta[name="twitter:card"]'), label).toHaveAttribute(
        'content',
        'summary_large_image',
      );

      const image = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(image, `${label} social image`).toMatch(/\.(png|jpe?g|webp)$/);
      const response = await request.get(new URL(image ?? '').pathname);
      expect(response.ok(), `${label} social image loads`).toBe(true);
      expect(response.headers()['content-type'] ?? '').toMatch(/^image\//);

      const missingAlt = await page.evaluate(() =>
        [...document.querySelectorAll('img')]
          .filter((img) => !img.hasAttribute('alt'))
          .map((img) => img.getAttribute('src')),
      );
      expect(missingAlt, `${label} images without an alt attribute`).toEqual([]);

      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      for (const block of blocks) {
        expect(() => JSON.parse(block), `${label} JSON-LD parses`).not.toThrow();
        expect(block).not.toMatch(/"@type":\s*"(Review|AggregateRating|Rating)"|ratingValue/);
      }
    }
  });

  test('the home page names the studio and carries the search entities', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Corvis | Web Design Studio for Local Businesses');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^The Core\s?Vision\.$/);
    const description =
      (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toMatch(/web design/i);
    expect(description).toMatch(/local businesses/i);

    const blocks = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
      (text) => JSON.parse(text) as Record<string, unknown>,
    );
    const types = blocks.map((block) => block['@type']);
    expect(types).toEqual(['WebSite', 'ProfessionalService', 'FAQPage']);
    const website = blocks[0] as { name: string; alternateName: string[]; url: string };
    expect(website.name).toBe('Corvis');
    expect(website.alternateName).toEqual(['The Corvis', 'Corvis Web Design', 'thecorvis']);
    const business = blocks[1] as { logo: { '@type': string; url: string } };
    expect(business.logo['@type']).toBe('ImageObject');
    expect(business.logo.url).toMatch(/\/logo-512\.png$/);
  });

  test('no search verification tags are emitted unless they are configured', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="google-site-verification"]')).toHaveCount(0);
    await expect(page.locator('meta[name="msvalidate.01"]')).toHaveCount(0);
  });
});
