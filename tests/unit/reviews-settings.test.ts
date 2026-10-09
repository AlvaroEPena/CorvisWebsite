import { describe, expect, it } from 'vitest';

import { parseReviewsSettings } from '../../src/lib/reviews-settings';

describe('parseReviewsSettings', () => {
  it('reads the switch', () => {
    expect(parseReviewsSettings({ showReviews: true }).showReviews).toBe(true);
    expect(parseReviewsSettings({ showReviews: false }).showReviews).toBe(false);
  });

  it('treats a missing key as off, the safe state', () => {
    expect(parseReviewsSettings({}).showReviews).toBe(false);
  });

  it('rejects anything that is not a true/false value, naming the file', () => {
    expect(() => parseReviewsSettings({ showReviews: 'yes' })).toThrow(/reviews-settings\.json/);
  });
});
