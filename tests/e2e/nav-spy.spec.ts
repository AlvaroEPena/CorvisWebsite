import { expect, test, type Page } from '@playwright/test';

/** Jumps so the section's top sits about 38% down the screen, where the navbar reads the page. */
async function readSection(page: Page, id: string): Promise<void> {
  await page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) throw new Error(`no #${sectionId}`);
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.34 + 60,
      behavior: 'instant',
    });
  }, id);
}

const activeLink = (page: Page) => page.locator('[data-nav-links] a[aria-current="location"]');

test.describe('navbar section highlight', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, 'The gliding pill is part of the desktop link row.');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('[data-nav-links]')).toHaveAttribute('data-ready', '');
  });

  test('follows the section being read, and Redesign counts as Work', async ({ page }) => {
    const expected: [string, string][] = [
      ['services', 'Services'],
      ['work', 'Work'],
      ['redesign', 'Work'],
      ['process', 'Process'],
      ['pricing', 'Pricing'],
      ['faq', 'FAQ'],
    ];
    for (const [section, label] of expected) {
      await readSection(page, section);
      await expect(activeLink(page)).toHaveText(label);
      await expect(activeLink(page)).toHaveCount(1);
    }
  });

  test('the glass pill sits behind the active link and glides between links', async ({ page }) => {
    const list = page.locator('[data-nav-links]');
    await readSection(page, 'services');
    await expect(list).toHaveAttribute('data-active', '');
    const pillX = () => list.evaluate((el) => parseFloat(el.style.getPropertyValue('--ind-x')));
    // Where a link sits inside the list, from real geometry (not offsetLeft, which is per list item).
    const linkX = (label: string) =>
      page.evaluate((text) => {
        const ul = document.querySelector('[data-nav-links]') as HTMLElement;
        const link = [...ul.querySelectorAll('a')].find((a) => a.textContent?.trim() === text);
        if (!link) throw new Error(`no link ${text}`);
        return link.getBoundingClientRect().left - ul.getBoundingClientRect().left;
      }, label);
    // The pill really is under the link: its painted box lines up with the link's box.
    const pillMatches = async (label: string) => {
      const link = await page.evaluate((text) => {
        const ul = document.querySelector('[data-nav-links]') as HTMLElement;
        const a = [...ul.querySelectorAll('a')].find((x) => x.textContent?.trim() === text);
        const r = a?.getBoundingClientRect();
        return r ? { left: r.left, width: r.width } : null;
      }, label);
      const pill = await list.evaluate((el) => {
        const ulBox = el.getBoundingClientRect();
        return {
          left: ulBox.left + parseFloat(el.style.getPropertyValue('--ind-x')),
          width: parseFloat(el.style.getPropertyValue('--ind-w')),
        };
      });
      expect(Math.abs(pill.left - (link?.left ?? -999))).toBeLessThan(1);
      expect(Math.abs(pill.width - (link?.width ?? -999))).toBeLessThan(1);
    };
    await expect.poll(pillX).toBeCloseTo(await linkX('Services'), 0);
    await pillMatches('Services');
    await readSection(page, 'pricing');
    await expect(activeLink(page)).toHaveText('Pricing');
    await expect.poll(pillX).toBeCloseTo(await linkX('Pricing'), 0);
    expect(await linkX('Pricing')).toBeGreaterThan((await linkX('Services')) + 50);
    await pillMatches('Pricing');

    // It animates with transform and width only.
    const transition = await list.evaluate(
      (el) => getComputedStyle(el, '::before').transitionProperty,
    );
    expect(transition).toContain('transform');
    expect(transition).toContain('width');
  });

  test('no link is highlighted at the top of the page or in sections the navbar does not list', async ({
    page,
  }) => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(activeLink(page)).toHaveCount(0);
    await expect(page.locator('[data-nav-links]')).not.toHaveAttribute('data-active', '');
    await readSection(page, 'contact');
    await expect(activeLink(page)).toHaveCount(0);
  });

  test('clicking a link highlights its target straight away', async ({ page }) => {
    await page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'FAQ' })
      .click();
    await expect(activeLink(page)).toHaveText('FAQ');
    await expect(page.locator('#faq')).toBeInViewport();
    await expect(activeLink(page)).toHaveText('FAQ');
  });

  test('is still and visible under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await readSection(page, 'process');
    await expect(activeLink(page)).toHaveText('Process');
    const transition = await page
      .locator('[data-nav-links]')
      .evaluate((el) => getComputedStyle(el, '::before').transitionDuration);
    expect(transition).toBe('0s');
  });
});

test.describe('navbar on other pages', () => {
  test('the pill rests under the current page link', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop link row only.');
    await page.goto('/team');
    const list = page.locator('[data-nav-links]');
    await expect(list).toHaveAttribute('data-active', '');
    await expect(page.locator('[data-nav-links] a[aria-current="page"]')).toHaveText(
      'Meet the team',
    );
  });
});
