import { describe, expect, it } from 'vitest';

import reviewsFile from '../../src/content/reviews.json';
import {
  getAllReviews,
  getFeaturedReviews,
  initialsOf,
  MAX_FEATURED_REVIEWS,
  parseReviews,
  siteLinkOf,
} from '../../src/lib/reviews';

const valid = {
  id: 'a-b',
  name: 'Ana Ruiz',
  role: 'Owner',
  company: 'Ruiz Bakery',
  quote: 'A quote that is long enough to pass the minimum length check.',
  featured: false,
};

describe('reviews data', () => {
  it('ships 9 to 12 valid reviews with unique kebab-case ids', () => {
    const all = getAllReviews();
    expect(all.length).toBeGreaterThanOrEqual(9);
    expect(all.length).toBeLessThanOrEqual(12);
    expect(new Set(all.map((review) => review.id)).size).toBe(all.length);
  });

  it('features at most six, in list order', () => {
    const featured = getFeaturedReviews();
    expect(featured.length).toBeGreaterThan(0);
    expect(featured.length).toBeLessThanOrEqual(MAX_FEATURED_REVIEWS);
    const order = getAllReviews().map((review) => review.id);
    const positions = featured.map((review) => order.indexOf(review.id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('uses no star ratings, plain hyphens and none of the banned words', () => {
    const copy = JSON.stringify(reviewsFile);
    expect(copy).not.toMatch(/[★☆]|stars?\b|rating/i);
    expect(copy).not.toMatch(/[–—]/);
    expect(copy).not.toMatch(/template|framework|\bAI\b/i);
  });
});

describe('parseReviews', () => {
  it('rejects duplicate ids', () => {
    expect(() => parseReviews({ reviews: [valid, valid] })).toThrow(/Duplicate/);
  });
  it('rejects more than six featured reviews', () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      ...valid,
      id: `r-${index}`,
      featured: true,
    }));
    expect(() => parseReviews({ reviews: many })).toThrow(/At most 6/);
  });
  it('rejects empty fields, short or long quotes and bad ids', () => {
    expect(() => parseReviews({ reviews: [{ ...valid, name: ' ' }] })).toThrow();
    expect(() => parseReviews({ reviews: [{ ...valid, quote: 'Too short' }] })).toThrow();
    expect(() => parseReviews({ reviews: [{ ...valid, quote: 'x'.repeat(400) }] })).toThrow();
    expect(() => parseReviews({ reviews: [{ ...valid, id: 'Not Kebab' }] })).toThrow();
  });
  it('accepts a missing, empty or null siteHref', () => {
    for (const siteHref of [undefined, '', null]) {
      const [review] = parseReviews({ reviews: [{ ...valid, siteHref }] });
      expect(review && siteLinkOf(review)).toBeUndefined();
    }
  });
});

describe('helpers', () => {
  it('returns the site link only when one is set', () => {
    expect(siteLinkOf({ ...valid, siteHref: ' /sandbox ' })).toBe('/sandbox');
  });
  it('builds initials without titles', () => {
    expect(initialsOf('Dr. Lena Brandt')).toBe('LB');
    expect(initialsOf('Marisol Okafor')).toBe('MO');
    expect(initialsOf('Cher')).toBe('C');
  });
});
