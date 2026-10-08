import { expect, test } from '@playwright/test';

/** The owner's mark: inline vector in the chrome, the new favicon set, and the social image. */

const PNG_SIGNATURE = '89504e470d0a1a0a';

function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test.describe('logo', () => {
  for (const path of ['/', '/sandbox', '/privacy', '/this-page-does-not-exist']) {
    test(`header and footer use the inline vector mark on ${path}`, async ({ page }) => {
      await page.goto(path);
      for (const region of [page.locator('body > header'), page.locator('body > footer')]) {
        const mark = region.locator('svg.mark').first();
        await expect(mark).toBeVisible();
        await expect(mark).toHaveAttribute('viewBox', '149 115.5 308 380.5');
        await expect(mark).toHaveAttribute('aria-hidden', 'true');
        await expect(mark.locator('path[stroke="#3b3bd6"]')).toHaveCount(1);
        await expect(mark.locator('path[stroke="#0e1024"]')).toHaveCount(1);
        await expect(mark.locator('path[fill="#ff8a2b"]')).toHaveCount(1);
        await expect(region.locator('.logo').first()).toContainText('Corvis');
        await expect(region.locator('.logo img')).toHaveCount(0);
      }
    });
  }

  test('the glass tile has a fixed box, so the nav height never changes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const tile = page.locator('body > header .glass-tile').first();
    const box = await tile.boundingBox();
    expect(box?.width).toBe(40);
    expect(box?.height).toBe(40);
    const nav = await page.getByTestId('nav').boundingBox();
    expect(nav?.height).toBeGreaterThanOrEqual(64);
    expect(nav?.height).toBeLessThanOrEqual(72);
  });

  test('the brand link keeps a visible keyboard focus ring', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard focus is a desktop concern.');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const brand = page.getByTestId('nav').locator('.brand');
    await expect(brand).toBeFocused();
    await expect(brand).toHaveCSS('outline-style', 'solid');
  });

  test('the 404 and thank-you pages carry the large decorative mark', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'The large emblem is hidden on phones.');
    for (const path of ['/this-page-does-not-exist', '/thanks']) {
      await page.goto(path);
      await expect(page.locator('main .emblem svg.mark')).toBeVisible();
    }
  });
});

test.describe('icons and social image', () => {
  test('head links the new favicon set and structured data names the logo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
      'href',
      '/favicon.svg',
    );
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/apple-touch-icon.png',
    );
    await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
      'href',
      '/favicon-32.png',
    );
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld ?? '{}')).toMatchObject({
      logo: expect.stringMatching(/\/logo-512\.png$/),
      image: expect.stringMatching(/\/og\.png$/),
    });
  });

  test('the SVG favicon draws the mark and adapts to dark tab bars', async ({ request }) => {
    const response = await request.get('/favicon.svg');
    expect(response.ok()).toBe(true);
    const svg = await response.text();
    for (const color of ['#3b3bd6', '#0e1024', '#ff8a2b']) expect(svg).toContain(color);
    expect(svg).toMatch(/prefers-color-scheme:\s*dark/);
    expect(svg).not.toMatch(/radialGradient|<circle/);
  });

  test('raster icons have the right dimensions', async ({ request }) => {
    const sizes = {
      '/og.png': { width: 1200, height: 630 },
      '/apple-touch-icon.png': { width: 180, height: 180 },
      '/favicon-32.png': { width: 32, height: 32 },
      '/logo-512.png': { width: 512, height: 512 },
    };
    for (const [path, expected] of Object.entries(sizes)) {
      const response = await request.get(path);
      expect(response.ok(), path).toBe(true);
      expect(pngSize(await response.body()), path).toEqual(expected);
    }
    const ico = await request.get('/favicon.ico');
    expect(ico.ok()).toBe(true);
    const bytes = await ico.body();
    expect([bytes.readUInt16LE(0), bytes.readUInt16LE(2)]).toEqual([0, 1]);
  });

  test('og tags describe the new mark and declare the image size', async ({ page }) => {
    await page.goto('/sandbox');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og\.png$/);
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
      'content',
      '1200',
    );
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
      'content',
      '630',
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      'content',
      /indigo C/,
    );
  });
});
