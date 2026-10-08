import type { Field } from '@sveltia/cms';

import { MAX_HOME_REVIEWS, QUOTE_MAX_LENGTH, QUOTE_MIN_LENGTH } from '../lib/reviews';

/**
 * The editors' fields for src/content/reviews/*.json (one file per review; the file name is the id).
 *
 * "All reviews" and "Home reviews" are two views of the SAME files, so a review exists exactly once and
 * an edit in one shows in the other. They differ in three ways only:
 *  - "Home reviews" is filtered to the reviews ticked "Show on the home page";
 *  - drag and drop writes a different number: `order` (Reviews page) or `homeOrder` (home page);
 *  - "Home reviews" has a confirm-gated "Remove from home screen" button instead of the tick box,
 *    and cannot delete (deleting a review is done in "All reviews").
 * Both position numbers are declared (hidden) in both editors so saving in one never drops the other.
 *
 * Field names are the JSON keys and their ORDER is the key order Sveltia writes, so it must match the
 * files exactly (tests/unit/admin-config.test.ts round-trips the real files through these
 * definitions). Validation limits come from src/lib/reviews.ts.
 */
export const REVIEWS_FOLDER = 'src/content/reviews';

/** Name of the custom field type that renders the confirm-gated "Remove from home screen" button. */
export const HOME_MEMBERSHIP_WIDGET = 'home-membership';

/** The question asked before a review leaves the home screen. */
export const removalMessage = (name: string): string =>
  `Remove ${name || 'this review'} from the home screen? It stays in All reviews.`;

const textFields: Field[] = [
  { name: 'name', label: 'Name', widget: 'string', hint: 'First and last name.' },
  {
    name: 'role',
    label: 'Role',
    widget: 'string',
    hint: 'For example "Owner" or "Practice Manager".',
  },
  { name: 'company', label: 'Business name', widget: 'string' },
  {
    name: 'quote',
    label: 'Quote',
    widget: 'text',
    hint: `${QUOTE_MIN_LENGTH} to ${QUOTE_MAX_LENGTH} characters. One to three sentences.`,
    pattern: [
      `^[\\s\\S]{${QUOTE_MIN_LENGTH},${QUOTE_MAX_LENGTH}}$`,
      `The quote must be ${QUOTE_MIN_LENGTH} to ${QUOTE_MAX_LENGTH} characters.`,
    ],
  },
];

/** Same field, same record, in both editors: it is the data key `showOnReviewsPage`. */
const showOnReviewsPageField: Field = {
  name: 'showOnReviewsPage',
  label: 'Show on the reviews page',
  widget: 'boolean',
  default: true,
  hint: 'Untick to keep this review off the Reviews page. It does not change the home page.',
};

const siteHrefField: Field = {
  name: 'siteHref',
  label: 'Link to their new site',
  widget: 'string',
  required: false,
  hint: 'Link to their new site; leave empty to show a disabled button.',
};

/** Written by drag and drop. Never shown: it is not for typing. */
const positionFields: Field[] = [
  { name: 'order', widget: 'hidden', required: false },
  { name: 'homeOrder', widget: 'hidden', required: false },
];

export const allReviewFields: Field[] = [
  ...textFields,
  {
    name: 'featured',
    label: 'Show on the home page',
    widget: 'boolean',
    default: false,
    hint: `Tick to show this review on the home page (at most ${MAX_HOME_REVIEWS}). Choose their order in Home reviews.`,
  },
  showOnReviewsPageField,
  siteHrefField,
  ...positionFields,
];

export const homeReviewFields: Field[] = [
  ...textFields,
  // Not a tick box here: a button (src/admin/home-membership-widget.ts) that asks first, then unticks
  // `featured` on this same record. Reviews created in this editor start on the home screen.
  {
    name: 'featured',
    label: 'Home screen',
    widget: HOME_MEMBERSHIP_WIDGET,
    default: true,
    hint: 'To put a removed review back, tick "Show on the home page" in All reviews.',
  },
  showOnReviewsPageField,
  siteHrefField,
  ...positionFields,
];

/** Every key a review file may contain, in the order Sveltia writes them. */
export const REVIEW_KEYS = allReviewFields.map((field) => field.name);

/** Shown beside the collection title, so kept to one short sentence each. */
export const ALL_REVIEWS_HINT =
  'Every review. Reorder sets the Reviews page order. Tick one to show it on the home page.';
export const HOME_REVIEWS_HINT = `Shown on the home page (up to ${MAX_HOME_REVIEWS}). Reorder sets their order. Open one to remove it from the home screen.`;
