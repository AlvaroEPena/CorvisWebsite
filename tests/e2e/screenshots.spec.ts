import { expect, test } from '@playwright/test';

import { mockTurnstile, revealEverything, settleAnimations } from './support';

const SECTIONS = ['hero', 'work', 'redesign', 'pricing', 'testimonials', 'faq', 'contact'] as const;

// Visual review aid: images land in test-results/ (git-ignored) and in the HTML report.
test.describe('screenshots for visual review', () => {
  test('home sections and secondary pages', async ({ page }, testInfo) => {
    await mockTurnstile(page);
    await page.goto('/');
    await revealEverything(page);

    for (const id of SECTIONS) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      // Let reveal transitions finish so the capture shows the settled state.
      await settleAnimations(page);
      const path = testInfo.outputPath(`${testInfo.project.name}-${id}.png`);
      const image = await section.screenshot({ path });
      expect(image.byteLength).toBeGreaterThan(1000);
      await testInfo.attach(`${testInfo.project.name}-${id}`, { path, contentType: 'image/png' });
    }

    for (const route of ['/privacy', '/thanks', '/missing']) {
      await page.goto(route);
      const name = route.slice(1);
      const path = testInfo.outputPath(`${testInfo.project.name}-${name}.png`);
      const image = await page.screenshot({ path, fullPage: true });
      expect(image.byteLength).toBeGreaterThan(1000);
      await testInfo.attach(`${testInfo.project.name}-${name}`, { path, contentType: 'image/png' });
    }
  });
});
