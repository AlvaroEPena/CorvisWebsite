import { z } from 'zod';

/**
 * Client reviews, edited in the admin (src/admin) and stored as ONE JSON file per review in
 * src/content/reviews/. The file name (without .json) is the review's id.
 *
 * Two orders are stored on the same record, so there is no second list that could disagree:
 *  - `order`     position on /reviews ("All reviews" editor)
 *  - `homeOrder` position among the featured ones on the home page ("Home reviews" editor)
 * Both are written by the editor's drag-and-drop; they are optional so a brand new review works.
 * Data is validated at build time so a bad edit fails the build instead of shipping.
 */
export const MAX_HOME_REVIEWS = 6;
export const QUOTE_MIN_LENGTH = 20;
export const QUOTE_MAX_LENGTH = 320;

const text = (max: number) => z.string().trim().min(1).max(max);
const position = z.number().int().positive().nullish();

export const reviewSchema = z.object({
  name: text(80),
  role: text(80),
  company: text(80),
  quote: z.string().trim().min(QUOTE_MIN_LENGTH).max(QUOTE_MAX_LENGTH),
  /** Shown on the home page (the first MAX_HOME_REVIEWS, in home order). */
  featured: z.boolean(),
  /** Listed on /reviews. Independent of `featured`; a review without the key counts as shown. */
  showOnReviewsPage: z.boolean().default(true),
  /** Link to the client's new site. Empty or missing means the button is disabled. */
  siteHref: z.string().trim().nullish(),
  order: position,
  homeOrder: position,
});

export type Review = z.infer<typeof reviewSchema> & { id: string };

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const idOf = (path: string): string =>
  path
    .split('/')
    .pop()
    ?.replace(/\.json$/, '') ?? path;

/** Position used for sorting: reviews without one go last. */
const rank = (value: number | null | undefined): number => value ?? Number.POSITIVE_INFINITY;

/** Orders by `key`, then keeps the incoming order (a stable sort) for ties and missing values. */
function sortedBy(list: readonly Review[], key: 'order' | 'homeOrder'): Review[] {
  return list
    .map((review, index) => ({ review, index }))
    .sort((a, b) => rank(a.review[key]) - rank(b.review[key]) || a.index - b.index)
    .map(({ review }) => review);
}

/**
 * Turns the loaded files (path -> parsed JSON) into reviews, ids from file names, sorted as on
 * /reviews. Throws a readable error naming the file when a record is invalid.
 */
export function parseReviews(files: Record<string, unknown>): Review[] {
  const reviews = Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, data]): Review => {
      const id = idOf(path);
      if (!ID_PATTERN.test(id))
        throw new Error(`Review file "${path}": use lowercase words joined by hyphens`);
      const result = reviewSchema.safeParse(data);
      if (!result.success) {
        throw new Error(`Review file "${path}": ${z.prettifyError(result.error)}`);
      }
      return { ...result.data, id };
    });
  if (reviews.length === 0) throw new Error('There must be at least one review');
  return sortedBy(reviews, 'order');
}

/**
 * The reviews shown on the home page. Membership is the "Show on the home page" tick; order is the
 * home order, with newly ticked reviews (no home position yet) after the placed ones, in /reviews
 * order. At most MAX_HOME_REVIEWS.
 */
export function pickHomeReviews(list: readonly Review[], max = MAX_HOME_REVIEWS): Review[] {
  return sortedBy(
    list.filter((review) => review.featured),
    'homeOrder',
  ).slice(0, max);
}

const loaded = import.meta.glob('../content/reviews/*.json', { eager: true, import: 'default' });
const reviews = parseReviews(loaded);

if (reviews.filter((review) => review.featured).length > MAX_HOME_REVIEWS) {
  console.warn(
    `More than ${MAX_HOME_REVIEWS} reviews are ticked "Show on the home page"; only the first ${MAX_HOME_REVIEWS} are shown.`,
  );
}

/** Every review, in the order the "All reviews" editor arranged them (hidden ones included). */
export const getAllReviews = (): readonly Review[] => reviews;

/** The reviews listed on /reviews: the ones with "Show on the reviews page", in that order. */
export const pickReviewsPageReviews = (list: readonly Review[]): Review[] =>
  list.filter((review) => review.showOnReviewsPage);

export const getReviewsPageReviews = (): Review[] => pickReviewsPageReviews(reviews);

/** The reviews on the home page, in the order the "Home reviews" editor arranged them. */
export const getHomeReviews = (list: readonly Review[] = reviews): Review[] =>
  pickHomeReviews(list);

/** The link a review's button goes to, or undefined when the button must be disabled. */
export function siteLinkOf(review: Pick<Review, 'siteHref'>): string | undefined {
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
