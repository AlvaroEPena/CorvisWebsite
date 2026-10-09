import { expect, test } from '@playwright/test';

import { PAGES } from './support';

test.describe('/privacy', () => {
  test('renders the privacy note, indexable, with a working way home', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What we collect' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your rights' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('link').first().click();
    await expect(page).toHaveURL(/localhost:4329\/(#main)?$/);
  });

  test('the form consent link reaches it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Read the privacy note' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  });

  test('navigation anchors on a sub page point back to the home sections', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Desktop link row.');
    await page.goto('/privacy');
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Pricing' })
      .click();
    await expect(page).toHaveURL(/localhost:4329\/#pricing$/);
    await expect(page.locator('#pricing')).toBeInViewport();
  });
});

test.describe('404', () => {
  test('unknown routes return a real 404 with the branded page', async ({ page }) => {
    const response = await page.goto('/definitely/not/here');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/lost its vision/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.getByRole('link', { name: 'Back to the homepage' }).click();
    await expect(page).toHaveURL(/localhost:4329\/$/);
  });

  test('protected-looking and API paths do not expose anything', async ({ request }) => {
    for (const path of ['/api/secret', '/.env', '/src/worker/env.ts', '/wrangler.jsonc']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
    }
  });
});

test.describe('SEO', () => {
  test('home has a unique title, description, canonical, OG and Twitter tags', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Corvis/);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0).toBeGreaterThan(50);
    expect(description?.length ?? 999).toBeLessThanOrEqual(170);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://thecorvis.com/',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Corvis/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://thecorvis.com/',
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://thecorvis.com/og.png',
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('titles and descriptions are unique across pages', async ({ page }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const { path } of PAGES.filter((entry) => entry.name !== '404')) {
      await page.goto(path);
      titles.add(await page.title());
      descriptions.add(
        (await page.locator('meta[name="description"]').getAttribute('content')) ?? '',
      );
    }
    const expected = PAGES.filter((entry) => entry.name !== '404').length;
    expect(titles.size).toBe(expected);
    expect(descriptions.size).toBe(expected);
  });

  test('JSON-LD parses, has ProfessionalService + FAQPage and no ratings or reviews', async ({
    page,
  }) => {
    await page.goto('/');
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    const parsed = blocks.map((text) => JSON.parse(text) as Record<string, unknown>);
    const types = parsed.map((entry) => entry['@type']);
    expect(types).toContain('ProfessionalService');
    expect(types).toContain('FAQPage');
    const serialised = blocks.join('\n');
    expect(serialised).not.toMatch(/aggregateRating|"review"|"Review"|ratingValue|reviewCount/);
    const faq = parsed.find((entry) => entry['@type'] === 'FAQPage') as {
      mainEntity: unknown[];
    };
    const visibleQuestions = await page.locator('#faq details').count();
    expect(faq.mainEntity).toHaveLength(visibleQuestions);
  });

  test('sitemap lists indexable pages only and robots.txt points to it', async ({ request }) => {
    const index = await request.get('/sitemap-index.xml');
    expect(index.status()).toBe(200);
    const sitemap = await request.get('/sitemap-0.xml');
    const xml = await sitemap.text();
    expect(xml).toContain('<loc>https://thecorvis.com/</loc>');
    expect(xml).toContain('<loc>https://thecorvis.com/privacy</loc>');
    expect(xml).not.toContain('/thanks');
    expect(xml).not.toContain('/404');

    const robots = await request.get('/robots.txt');
    const text = await robots.text();
    expect(text).toMatch(/User-agent: \*/);
    expect(text).toMatch(/Sitemap: https:\/\/.+\/sitemap-index\.xml/);
    expect(text).not.toMatch(/Disallow: \/\s*$/m);
  });

  test('the OG image and favicon are served', async ({ request }) => {
    expect((await request.get('/og.png')).status()).toBe(200);
    expect((await request.get('/favicon.svg')).status()).toBe(200);
  });
});
