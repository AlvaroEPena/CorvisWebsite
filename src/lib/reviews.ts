import { z } from 'zod';

import reviewsFile from '../content/reviews.json';

/**
 * Client reviews, edited in the admin (src/admin) and stored in src/content/reviews.json.
 * List order is display order everywhere. Validated at build time so a bad edit fails the build
 * instead of shipping.
 */
export const MAX_FEATURED_REVIEWS = 6;
export const QUOTE_MIN_LENGTH = 20;
export const QUOTE_MAX_LENGTH = 320;

const text = (max: number) => z.string().trim().min(1).max(max);

export const reviewSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase words joined by hyphens'),
  name: text(80),
  role: text(80),
  company: text(80),
  quote: z.string().trim().min(QUOTE_MIN_LENGTH).max(QUOTE_MAX_LENGTH),
  /** Shown in the home page preview. */
  featured: z.boolean(),
  /** Link to the client's new site. Empty or missing means the button is disabled. */
  siteHref: z.string().trim().nullish(),
});

export const reviewsFileSchema = z
  .object({ reviews: z.array(reviewSchema).min(1) })
  .superRefine(({ reviews }, context) => {
    const seen = new Set<string>();
    for (const [index, review] of reviews.entries()) {
      if (seen.has(review.id)) {
        context.addIssue({
          code: 'custom',
          path: ['reviews', index, 'id'],
          message: `Duplicate review id "${review.id}"`,
        });
      }
      seen.add(review.id);
    }
    const featured = reviews.filter((review) => review.featured).length;
    if (featured > MAX_FEATURED_REVIEWS) {
      context.addIssue({
        code: 'custom',
        path: ['reviews'],
        message: `At most ${MAX_FEATURED_REVIEWS} reviews can be shown on the home page (found ${featured})`,
      });
    }
  });

export type Review = z.infer<typeof reviewSchema>;

export function parseReviews(input: unknown): Review[] {
  return reviewsFileSchema.parse(input).reviews;
}

const reviews = parseReviews(reviewsFile);

/** Every review, in the order the editor arranged them. */
export const getAllReviews = (): readonly Review[] => reviews;

/** The reviews ticked "show on the home page", in list order. */
export const getFeaturedReviews = (list: readonly Review[] = reviews): Review[] =>
  list.filter((review) => review.featured);

/** The link a review's button goes to, or undefined when the button must be disabled. */
export function siteLinkOf(review: Review): string | undefined {
  return review.siteHref?.trim() || undefined;
}

/** Two-letter monogram for the avatar, skipping titles such as "Dr.". */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter((word) => word && !/^(dr|mr|mrs|ms)\.?$/i.test(word));
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
