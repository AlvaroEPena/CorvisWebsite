import { expect, test } from '@playwright/test';

test.describe('Work previews never take a touch', () => {
  test('a see-through shield covers each preview and only allows page scrolling', async ({
    page,
  }) => {
    await page.goto('/');
    const stages = page.locator('#work .live-stage');
    await expect(stages).toHaveCount(3);
    for (const stage of await stages.all()) {
      await stage.scrollIntoViewIfNeeded();
      const info = await stage.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        const shield = getComputedStyle(node, '::after');
        return {
          topIsStage: top !== null && top.closest('.live-stage') === node,
          topIsFrame: top instanceof HTMLIFrameElement,
          touchAction: shield.touchAction,
          covers: shield.position === 'absolute' && shield.content !== 'none',
        };
      });
      expect(info.topIsFrame).toBe(false);
      expect(info.topIsStage).toBe(true);
      expect(info.touchAction).toBe('pan-y pinch-zoom');
      expect(info.covers).toBe(true);
    }
  });

  test('the demo cannot be scrolled by the visitor, only by the animation', async ({ page }) => {
    await page.goto('/');
    await page.locator('#work .live-stage').first().scrollIntoViewIfNeeded();
    const frame = page.locator('#work .live-stage iframe').first();
    await expect(frame).toHaveAttribute('scrolling', 'no', { timeout: 20000 });
    await expect(frame).toHaveAttribute('inert', '');
    await expect
      .poll(() =>
        frame.evaluate((node: HTMLIFrameElement) => {
          const doc = node.contentDocument;
          return doc ? getComputedStyle(doc.documentElement).overflowY : 'none';
        }),
      )
      .toBe('hidden');
  });
});
