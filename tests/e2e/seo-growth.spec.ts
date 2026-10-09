import { expect, test } from '@playwright/test';

import { servicePages } from '../../src/content/service-pages';
import { site } from '../../src/content/site';
import { structuredData } from './support';

const CITIES = site.coverage.cities;

test.describe('where we work', () => {
  test('the home page defines Corvis in one visible sentence near the top', async ({ page }) => {
    await page.goto('/');
    const definition = page.getByTestId('hero-definition');
    await expect(definition).toBeVisible();
    await expect(definition).toHaveText(site.coverage.definition);
    expect(await page.title()).toBe(site.title);
  });

  test('the footer and the team page name the cities, and no street address appears', async ({
    page,
  }) => {
    await page.goto('/');
    const footer = page.getByTestId('footer-coverage');
    for (const city of CITIES) await expect(footer).toContainText(city);
    await page.goto('/team');
    const coverage = page.getByTestId('team-coverage');
    for (const city of CITIES) await expect(coverage).toContainText(city);
    await expect(page.locator('body')).not.toContainText(
      /\d+ [A-Z][a-z]+ (Street|St\.|Avenue|Ave)\b/,
    );
  });

  test('structured data serves the US and the six cities, not "Worldwide"', async ({ page }) => {
    await page.goto('/');
    const blocks = await structuredData(page);
    const business = blocks.find((block) => block['@type'] === 'ProfessionalService') as {
      areaServed: { name: string }[];
    };
    expect(business.areaServed.map((place) => place.name)).toEqual(['United States', ...CITIES]);
    expect(JSON.stringify(blocks)).not.toContain('Worldwide');
  });
});

test.describe('service pages', () => {
  for (const entry of servicePages) {
    test(`/services/${entry.slug} is a real, indexable page with its own structured data`, async ({
      page,
    }) => {
      const response = await page.goto(`/services/${entry.slug}`);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(entry.metaTitle);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        entry.description,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        new RegExp(`/services/${entry.slug}$`),
      );
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(entry.heading);
      const words = (await page.getByTestId('service-page').innerText()).split(/\s+/).length;
      expect(words).toBeGreaterThan(500);

      const blocks = await structuredData(page);
      expect(blocks.map((block) => block['@type']).sort()).toEqual(['BreadcrumbList', 'Service']);
      await expect(
        page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]'),
      ).toHaveText(entry.name);
      await expect(
        page.locator('main').getByRole('link', { name: 'Book a free consult' }),
      ).toHaveAttribute('href', '/#contact');
    });
  }

  test('the home page and footer link to every service page', async ({ page }) => {
    await page.goto('/');
    for (const entry of servicePages) {
      await expect(page.locator(`#services a[href="/services/${entry.slug}"]`)).toHaveCount(1);
      await expect(page.locator(`body > footer a[href="/services/${entry.slug}"]`)).toHaveCount(1);
    }
  });

  test('they are in the sitemap with a last-modified date', async ({ request }) => {
    const xml = await (await request.get('/sitemap-0.xml')).text();
    for (const entry of servicePages) expect(xml).toContain(`/services/${entry.slug}</loc>`);
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
  });
});

test.describe('more search signals', () => {
  test('the team page ties both founders to the business and has a breadcrumb', async ({
    page,
  }) => {
    await page.goto('/team');
    const blocks = await structuredData(page);
    const people = blocks.filter((block) => block['@type'] === 'Person');
    expect(people.map((person) => person.name)).toEqual(site.team.map((member) => member.name));
    for (const person of people) {
      expect(person.worksFor).toEqual({ '@id': expect.stringMatching(/#business$/) });
    }
    expect(blocks.some((block) => block['@type'] === 'BreadcrumbList')).toBe(true);
  });

  test('the sandbox has a breadcrumb', async ({ page }) => {
    await page.goto('/sandbox');
    const blocks = await structuredData(page);
    expect(blocks.some((block) => block['@type'] === 'BreadcrumbList')).toBe(true);
  });

  test('llms.txt summarises the business with current prices and links', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    const text = await response.text();
    expect(text).toContain(site.coverage.definition);
    expect(text).toContain('3,800');
    expect(text).toContain('4,940');
    expect(text).toContain('274 per month');
    expect(text).toContain('/services/web-design');
    expect(text).not.toMatch(/\$\d/);
  });

  test('the redesign slider is retitled as a sample, and live client sites are linked', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('#redesign-title')).toHaveText('See a redesign, before and after.');
    await expect(page.locator('#redesign')).toContainText('not a client');
    const visits = page.getByTestId('project-visit');
    await expect(visits).toHaveCount(2);
    await expect(visits.nth(0)).toHaveAttribute('href', 'https://refinedcelebrations.co');
    await expect(visits.nth(1)).toHaveAttribute('href', 'https://modlabs.store');
    // The concept project is never linked as if it were live.
    await expect(page.locator('[data-project="grit"] [data-testid="project-visit"]')).toHaveCount(
      0,
    );
  });
});
