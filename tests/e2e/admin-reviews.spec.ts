import { mkdirSync, readdirSync, readFileSync } from 'node:fs';

import { expect, type Page, test } from '@playwright/test';

import { GithubMock } from './support/github-mock';

const DIR = 'src/content/reviews';
const SETTINGS = 'src/content/reviews-settings.json';
const SHOTS = process.env.ADMIN_SHOTS_DIR;

type Record_ = Record<string, unknown>;

/** The real review files, with a few changes so the Home list has four reviews in a custom order. */
function seededRepo(): Map<string, string> {
  const files = new Map<string, string>();
  for (const name of readdirSync(DIR)) {
    files.set(`${DIR}/${name}`, readFileSync(`${DIR}/${name}`, 'utf8'));
  }
  const patch = (id: string, changes: Record_) => {
    const path = `${DIR}/${id}.json`;
    const record = JSON.parse(files.get(path) ?? '{}') as Record_;
    files.set(path, `${JSON.stringify({ ...record, ...changes }, null, 2)}\n`);
  };
  files.set(SETTINGS, readFileSync(SETTINGS, 'utf8'));
  patch('copper-kettle', { homeOrder: 1 });
  patch('ridgeline-landscape', { homeOrder: 2 });
  patch('harbor-physio', { homeOrder: 3 });
  patch('maison-fleur', { featured: true, homeOrder: 4 });
  return files;
}

async function openEditor(page: Page): Promise<GithubMock> {
  const mock = new GithubMock(seededRepo());
  await mock.install(page);
  await page.goto('/admin');
  await expect(page.getByText('All reviews', { exact: true }).first()).toBeVisible({
    timeout: 20000,
  });
  return mock;
}

/** The entry rows currently listed, as "Name - Business" text. */
const rows = (page: Page) => page.getByRole('row').filter({ hasText: ' - ' });

const home = (page: Page) => page.getByText('Home reviews', { exact: true }).first();

/** Keys whose value differs between a seeded record and the text a Save wrote. */
function changedKeys(id: string, text: string | null | undefined): string[] {
  const before = JSON.parse(seededRepo().get(`${DIR}/${id}.json`) ?? '{}') as Record_;
  const after = JSON.parse(text ?? '{}') as Record_;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(700); // let the page transition finish
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test.describe('/admin reviews editors (GitHub mocked, nothing leaves the machine)', () => {
  test.skip(({ isMobile }) => isMobile, 'The editor is used on a desktop.');
  test.use({ viewport: { width: 1440, height: 900 } });

  test('All reviews lists everyone; Home reviews lists only the ticked ones, in home order', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    await expect(page.getByText('Marisol Okafor - Lawn and garden care')).toBeVisible();
    await expect(rows(page)).toHaveCount(11);
    await shot(page, 'admin-all-reviews');

    await home(page).click();
    await expect(rows(page)).toHaveCount(4);
    expect(await rows(page).allInnerTexts()).toEqual([
      expect.stringContaining('Tomas Reyes'),
      expect.stringContaining('Marisol Okafor'),
      expect.stringContaining('Dr. Lena Brandt'),
      expect.stringContaining('Priya Venkataraman'),
    ]);
    await shot(page, 'admin-home-reviews');
    expect(mock.unhandled).toEqual([]);
  });

  test('moving a review in Home reviews writes only homeOrder, one record per review', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    await home(page).click();
    await page.getByRole('button', { name: 'Reorder' }).first().click();
    // Priya (4th) up to the top.
    for (const index of [3, 2, 1]) {
      await page.getByRole('button', { name: 'Move Up' }).nth(index).click();
    }
    await shot(page, 'admin-home-reordering');
    await page.getByRole('button', { name: 'Done Reordering Entries' }).click();
    await expect.poll(() => mock.commits.length).toBe(1);

    const written = Object.fromEntries(
      (mock.commits[0] ?? []).map(({ path, text }) => [path, JSON.parse(text ?? '{}') as Record_]),
    );
    const homeOrderOf = (id: string) => written[`${DIR}/${id}.json`]?.homeOrder;
    expect(homeOrderOf('maison-fleur')).toBe(1);
    expect(homeOrderOf('copper-kettle')).toBe(2);
    expect(homeOrderOf('ridgeline-landscape')).toBe(3);
    expect(homeOrderOf('harbor-physio')).toBe(4);
    // Only home positions changed: every other value of the same records is untouched.
    for (const [path, record] of Object.entries(written)) {
      const before = JSON.parse(seededRepo().get(path) ?? '{}') as Record_;
      const withoutHomeOrder = (entry: Record_) =>
        Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'homeOrder'));
      expect(withoutHomeOrder(record), path).toEqual(withoutHomeOrder(before));
    }
    expect(Object.keys(written)).toHaveLength(4);
    expect(mock.unhandled).toEqual([]);
  });

  test('Home reviews edits the same record, has no home toggle and cannot delete', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    await home(page).click();
    await expect(page.getByRole('button', { name: 'Create New Entry' })).toBeEnabled();
    await rows(page).first().getByRole('checkbox').check();
    await expect(page.getByRole('button', { name: 'Delete Selected Entry' })).toBeDisabled();
    await rows(page).first().getByRole('checkbox').uncheck();

    await page.getByText('Marisol Okafor - Lawn and garden care').click();
    await expect(page.getByRole('textbox', { name: 'Role' })).toBeVisible();
    await expect(page.getByRole('switch', { name: /Show on the home page/ })).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Role' }).fill('Owner and founder');
    await shot(page, 'admin-home-edit');
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect.poll(() => mock.commits.length).toBe(1);

    const [change] = mock.commits[0] ?? [];
    expect(change?.path).toBe(`${DIR}/ridgeline-landscape.json`);
    const record = JSON.parse(change?.text ?? '{}') as Record_;
    expect(record).toMatchObject({
      role: 'Owner and founder',
      featured: true,
      order: 1,
      homeOrder: 2,
    });
    expect(mock.commits[0]).toHaveLength(1);
  });

  test('unticking "Show on the home page" in All reviews removes it from Home reviews', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    await page.getByText('Priya Venkataraman - Hair salon').click();
    await page.getByRole('switch', { name: /Show on the home page/ }).click();
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect.poll(() => mock.commits.length).toBe(1);
    const record = JSON.parse(mock.commits[0]?.[0]?.text ?? '{}') as Record_;
    expect(record.featured).toBe(false);
    expect(record.homeOrder).toBe(4);

    await home(page).click();
    await expect(rows(page)).toHaveCount(3);
    await expect(page.getByText('Priya Venkataraman')).toHaveCount(0);
  });

  test('a review added in Home reviews is one new record, ticked for the home page', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    await home(page).click();
    await page.getByRole('button', { name: 'Create New Entry' }).click();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Noor Haddad');
    await page.getByRole('textbox', { name: 'Role' }).fill('Owner');
    await page.getByRole('textbox', { name: 'Industry' }).fill('Tile and stone');
    await page
      .getByRole('textbox', { name: 'Quote' })
      .fill('A calm, clear process and a site that finally shows our finished work.');
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect.poll(() => mock.commits.length).toBe(1);

    expect(mock.commits[0]).toHaveLength(1);
    const [change] = mock.commits[0] ?? [];
    expect(change?.path).toMatch(/^src\/content\/reviews\/[a-z0-9-]+\.json$/);
    const record = JSON.parse(change?.text ?? '{}') as Record_;
    expect(record).toMatchObject({
      name: 'Noor Haddad',
      industry: 'Tile and stone',
      featured: true,
    });
    expect(record).not.toHaveProperty('siteHref');
  });

  test('Home reviews shows the remove button, not the home tick box; All reviews shows the tick box', async ({
    page,
  }) => {
    await openEditor(page);
    await page.getByText('Marisol Okafor - Lawn and garden care').click();
    await expect(page.getByRole('switch', { name: /Show on the home page/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove from home screen' })).toHaveCount(0);
    await expect(page.getByRole('switch', { name: /Show on the reviews page/ })).toBeVisible();
    await shot(page, 'admin-all-edit');
    await page.goBack();

    await home(page).click();
    await page.getByText('Marisol Okafor - Lawn and garden care').click();
    await expect(page.getByRole('button', { name: 'Remove from home screen' })).toBeVisible();
    await expect(page.getByText('This review is on the home screen.')).toBeVisible();
    await expect(page.getByRole('switch', { name: /Show on the home page/ })).toHaveCount(0);
    await expect(page.getByRole('switch', { name: /Show on the reviews page/ })).toBeVisible();
    await shot(page, 'admin-home-edit-remove-button');
  });

  test('removing from the home screen asks first; cancel changes nothing', async ({ page }) => {
    const mock = await openEditor(page);
    await home(page).click();
    await page.getByText('Marisol Okafor - Lawn and garden care').click();

    const messages: string[] = [];
    page.once('dialog', (dialog) => {
      messages.push(dialog.message());
      void dialog.dismiss();
    });
    await page.getByRole('button', { name: 'Remove from home screen' }).click();
    expect(messages).toEqual([
      'Remove Marisol Okafor from the home screen? It stays in All reviews.',
    ]);
    await expect(page.getByText('This review is on the home screen.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' }).first()).toBeDisabled();
    expect(mock.commits).toHaveLength(0);
  });

  test('confirming removes it from the home screen: one field changes, it leaves Home reviews', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    await home(page).click();
    await page.getByText('Marisol Okafor - Lawn and garden care').click();

    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: 'Remove from home screen' }).click();
    await expect(
      page.getByText('This review will leave the home screen when you press Save.'),
    ).toBeVisible();
    await shot(page, 'admin-home-removal-pending');
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect.poll(() => mock.commits.length).toBe(1);

    expect(mock.commits[0]).toHaveLength(1);
    const [change] = mock.commits[0] ?? [];
    expect(change?.path).toBe(`${DIR}/ridgeline-landscape.json`);
    expect(changedKeys('ridgeline-landscape', change?.text)).toEqual(['featured']);
    expect(JSON.parse(change?.text ?? '{}')).toMatchObject({ featured: false });

    await expect(rows(page)).toHaveCount(3);
    await expect(page.getByText('Marisol Okafor')).toHaveCount(0);
    await shot(page, 'admin-home-after-removal');
    await page.getByText('All reviews', { exact: true }).first().click();
    await page.getByText('Marisol Okafor - Lawn and garden care').click();
    await expect(page.getByRole('switch', { name: /Show on the home page/ })).not.toBeChecked();
  });

  test('"Show on the reviews page" changes the same record, one field, from either editor', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    const toggleAndSave = async (label: string) => {
      await page.getByText(label).click();
      await page.getByRole('switch', { name: /Show on the reviews page/ }).click();
      await page.getByRole('button', { name: 'Save' }).first().click();
    };

    await toggleAndSave('Calvin Dubois - Pool construction'); // All reviews
    await expect.poll(() => mock.commits.length).toBe(1);
    expect(changedKeys('bluewater-pools', mock.commits[0]?.[0]?.text)).toEqual([
      'showOnReviewsPage',
    ]);
    expect(JSON.parse(mock.commits[0]?.[0]?.text ?? '{}')).toMatchObject({
      showOnReviewsPage: false,
    });

    await home(page).click();
    await toggleAndSave('Tomas Reyes - Cafe'); // Home reviews
    await expect.poll(() => mock.commits.length).toBe(2);
    expect(mock.commits[1]).toHaveLength(1);
    expect(changedKeys('copper-kettle', mock.commits[1]?.[0]?.text)).toEqual(['showOnReviewsPage']);
    // Hidden from the Reviews page, still on the home screen.
    await expect(rows(page)).toHaveCount(4);
  });

  test('Website settings: one switch turns the reviews buttons and page on or off', async ({
    page,
  }) => {
    const mock = await openEditor(page);
    await page.getByText('Website settings', { exact: true }).first().click();
    await page.getByText('Reviews on the website', { exact: true }).first().click();
    const toggle = page.getByRole('switch', { name: /Show reviews buttons and the Reviews page/ });
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect.poll(() => mock.commits.length).toBe(1);

    expect(mock.commits[0]).toHaveLength(1);
    const [change] = mock.commits[0] ?? [];
    expect(change?.path).toBe(SETTINGS);
    expect(JSON.parse(change?.text ?? '{}')).toEqual({ showReviews: true });
  });
});
