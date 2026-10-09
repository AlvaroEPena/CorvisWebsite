import { describe, expect, it } from 'vitest';

import {
  getAllReviews,
  getHomeReviews,
  initialsOf,
  MAX_HOME_REVIEWS,
  parseReviews,
  pickHomeReviews,
  pickReviewsPageReviews,
  type Review,
  siteLinkOf,
} from '../../src/lib/reviews';

const valid = {
  name: 'Ana Ruiz',
  role: 'Owner',
  industry: 'Bakery',
  quote: 'A quote that is long enough to pass the minimum length check.',
  featured: false,
};

const review = (id: string, extra: Partial<Review> = {}): Review => ({
  ...valid,
  showOnReviewsPage: true,
  id,
  ...extra,
});
const ids = (list: readonly Review[]) => list.map((item) => item.id);

describe('reviews data', () => {
  it('ships 9 to 12 valid reviews with unique kebab-case ids', () => {
    const all = getAllReviews();
    expect(all.length).toBeGreaterThanOrEqual(9);
    expect(all.length).toBeLessThanOrEqual(12);
    expect(new Set(ids(all)).size).toBe(all.length);
  });

  it('shows between one and six reviews on the home page, all ticked', () => {
    const home = getHomeReviews();
    expect(home.length).toBeGreaterThan(0);
    expect(home.length).toBeLessThanOrEqual(MAX_HOME_REVIEWS);
    expect(home.every((item) => item.featured)).toBe(true);
  });

  it('uses no star ratings, plain hyphens and none of the banned words', () => {
    const copy = JSON.stringify(getAllReviews());
    expect(copy).not.toMatch(/[★☆]|stars?\b|rating/i);
    expect(copy).not.toMatch(/[–—]/);
    expect(copy).not.toMatch(/template|framework|\bAI\b/i);
  });
});

describe('parseReviews', () => {
  const files = (record: unknown, path = '../content/reviews/ana-ruiz.json') => ({
    [path]: record,
  });

  it('takes the id from the file name and sorts by the Reviews page order', () => {
    const parsed = parseReviews({
      '../content/reviews/b-two.json': { ...valid, order: 2 },
      '../content/reviews/a-one.json': { ...valid, order: 1 },
      '../content/reviews/c-new.json': valid,
    });
    expect(ids(parsed)).toEqual(['a-one', 'b-two', 'c-new']);
  });
  it('rejects empty fields, short or long quotes and bad file names, naming the file', () => {
    expect(() => parseReviews(files({ ...valid, name: ' ' }))).toThrow(/ana-ruiz\.json/);
    expect(() => parseReviews(files({ ...valid, quote: 'Too short' }))).toThrow();
    expect(() => parseReviews(files({ ...valid, quote: 'x'.repeat(400) }))).toThrow();
    expect(() => parseReviews(files(valid, '../content/reviews/Not Kebab.json'))).toThrow(
      /hyphens/,
    );
  });
  it('rejects a bad position number and an empty folder', () => {
    expect(() => parseReviews(files({ ...valid, order: 0 }))).toThrow();
    expect(() => parseReviews(files({ ...valid, homeOrder: 1.5 }))).toThrow();
    expect(() => parseReviews({})).toThrow(/at least one/);
  });
  it('accepts a missing, empty or null siteHref and missing positions', () => {
    for (const siteHref of [undefined, '', null]) {
      const [parsed] = parseReviews(files({ ...valid, siteHref }));
      expect(parsed && siteLinkOf(parsed)).toBeUndefined();
    }
  });
});

describe('home order rule', () => {
  it('shows exactly the ticked reviews, in home order', () => {
    const list = [
      review('a', { featured: true, homeOrder: 2 }),
      review('b'),
      review('c', { featured: true, homeOrder: 1 }),
    ];
    expect(ids(pickHomeReviews(list))).toEqual(['c', 'a']);
  });
  it('puts newly ticked reviews (no home position) after the placed ones, in Reviews page order', () => {
    const list = [
      review('a', { featured: true }),
      review('b', { featured: true, homeOrder: 5 }),
      review('c', { featured: true }),
      review('d', { featured: true, homeOrder: 1 }),
    ];
    expect(ids(pickHomeReviews(list))).toEqual(['d', 'b', 'a', 'c']);
  });
  it('ignores the home position of a review that is not ticked', () => {
    const list = [review('a', { homeOrder: 1 }), review('b', { featured: true, homeOrder: 2 })];
    expect(ids(pickHomeReviews(list))).toEqual(['b']);
  });
  it('breaks ties by Reviews page order', () => {
    const list = [
      review('a', { featured: true, homeOrder: 1 }),
      review('b', { featured: true, homeOrder: 1 }),
    ];
    expect(ids(pickHomeReviews(list))).toEqual(['a', 'b']);
  });
  it('shows at most six, keeping the first six in home order', () => {
    const list = Array.from({ length: 8 }, (_, index) =>
      review(`r-${index}`, { featured: true, homeOrder: 8 - index }),
    );
    const home = pickHomeReviews(list);
    expect(home).toHaveLength(MAX_HOME_REVIEWS);
    expect(ids(home)).toEqual(['r-7', 'r-6', 'r-5', 'r-4', 'r-3', 'r-2']);
  });
  it('is empty when nothing is ticked', () => {
    expect(pickHomeReviews([review('a')])).toEqual([]);
  });
});

describe('Reviews page rule', () => {
  it('lists only reviews with "Show on the reviews page", keeping the Reviews page order', () => {
    const list = [review('a'), review('b', { showOnReviewsPage: false }), review('c')];
    expect(ids(pickReviewsPageReviews(list))).toEqual(['a', 'c']);
  });
  it('is independent of the home page tick, both ways', () => {
    const list = [
      review('on-home-only', { featured: true, showOnReviewsPage: false, homeOrder: 1 }),
      review('on-page-only', { featured: false, showOnReviewsPage: true }),
    ];
    expect(ids(pickHomeReviews(list))).toEqual(['on-home-only']);
    expect(ids(pickReviewsPageReviews(list))).toEqual(['on-page-only']);
  });
  it('treats a file without the key as shown, and rejects a non-boolean', () => {
    const [parsed] = parseReviews({ '../content/reviews/ana-ruiz.json': valid });
    expect(parsed?.showOnReviewsPage).toBe(true);
    expect(() =>
      parseReviews({ '../content/reviews/ana-ruiz.json': { ...valid, showOnReviewsPage: 'no' } }),
    ).toThrow();
  });
  it('ships every review file with the key set to true', () => {
    expect(getAllReviews().every((item) => item.showOnReviewsPage)).toBe(true);
  });
});

describe('helpers', () => {
  it('returns the site link only when one is set', () => {
    expect(siteLinkOf({ siteHref: ' /sandbox ' })).toBe('/sandbox');
  });
  it('builds initials without titles', () => {
    expect(initialsOf('Dr. Lena Brandt')).toBe('LB');
    expect(initialsOf('Marisol Okafor')).toBe('MO');
    expect(initialsOf('Cher')).toBe('C');
  });
});
