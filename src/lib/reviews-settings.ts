import { z } from 'zod';

import raw from '../content/reviews-settings.json';

/**
 * The one switch for every public mention of reviews, edited in the admin ("Website settings").
 * ON: the "Reviews" links in the navbar and footer, the /reviews page, and "More reviews" next to
 * "Meet the team". OFF: all of those are gone and the button reads "View Sandbox" instead.
 * The reviews themselves stay stored either way.
 */
export const reviewsSettingsSchema = z.object({
  /** A missing key counts as off, the safe state. */
  showReviews: z.boolean().default(false),
});

export type ReviewsSettings = z.infer<typeof reviewsSettingsSchema>;

/** Validates the settings file; a bad edit fails the build instead of shipping. */
export function parseReviewsSettings(data: unknown): ReviewsSettings {
  const result = reviewsSettingsSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`reviews-settings.json: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const reviewsSettings = parseReviewsSettings(raw);

/** True when the reviews page and every link and button to it should be on the website. */
export const reviewsVisible = reviewsSettings.showReviews;
