import { expect, test } from '@playwright/test';

test.describe('J4 before/after slider', () => {
  test('keyboard arrows, Home and End move the reveal and update the accessible value', async ({
    page,
  }) => {
    await page.goto('/#redesign');
    const slider = page.getByRole('slider', { name: /Compare the original site/ });
    const before = page.locator('[data-ba-before]');
    await slider.focus();

    await expect(slider).toHaveValue('50');
    const startWidth = await before.evaluate((el) => (el as HTMLElement).style.width);

    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('51');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveValue('49');
    await page.keyboard.press('End');
    await expect(slider).toHaveValue('100');
    await page.keyboard.press('Home');
    await expect(slider).toHaveValue('0');

    const endWidth = await before.evaluate((el) => (el as HTMLElement).style.width);
    expect(endWidth).not.toBe(startWidth);
    await expect(slider).toHaveAttribute('aria-valuetext', /.+/);
  });

  test('the browser accessibility tree exposes the slider value (aria-valuenow equivalent)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'Uses the Chromium accessibility CDP domain.');
    await page.goto('/#redesign');
    const slider = page.getByRole('slider', { name: /Compare the original site/ });
    await slider.focus();
    await page.keyboard.press('End');
    // A native <input type="range"> has no literal aria-valuenow attribute; assistive technology
    // reads its value from the accessibility tree, which is what spec J4 means.
    const session = await page.context().newCDPSession(page);
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const node = nodes.find(
      (entry) => entry.role?.value === 'slider' && String(entry.name?.value).includes('Compare'),
    );
    expect(node?.value?.value).toBe(100);
  });

  test('dragging the handle changes the position', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse drag is a desktop interaction; touch is covered by the tap test.');
    await page.goto('/#redesign');
    const slider = page.getByRole('slider', { name: /Compare the original site/ });
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    if (!box) throw new Error('slider has no box');
    const startValue = Number(await slider.inputValue());

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();

    const endValue = Number(await slider.inputValue());
    expect(endValue).toBeGreaterThan(startValue + 15);
    const width = await page
      .locator('[data-ba-before]')
      .evaluate((el) => (el as HTMLElement).style.width);
    expect(width).toBe(`${endValue}%`);
  });

  test('tapping the track on a touch viewport moves the reveal', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch viewport only.');
    await page.goto('/#redesign');
    const slider = page.getByRole('slider', { name: /Compare the original site/ });
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    if (!box) throw new Error('slider has no box');
    await page.touchscreen.tap(box.x + box.width * 0.2, box.y + box.height / 2);
    expect(Number(await slider.inputValue())).toBeLessThan(40);
  });
});
