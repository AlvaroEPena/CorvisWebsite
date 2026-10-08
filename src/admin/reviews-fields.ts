import type { Field } from '@sveltia/cms';

import { MAX_HOME_REVIEWS, QUOTE_MAX_LENGTH, QUOTE_MIN_LENGTH } from '../lib/reviews';

/**
 * The editors' fields for src/content/reviews/*.json (one file per review; the file name is the id).
 *
 * "All reviews" and "Home reviews" are two views of the SAME files, so a review exists exactly once and
 * an edit in one shows in the other. They differ in three ways only:
 *  - "Home reviews" is filtered to the reviews ticked "Show on the home page";
 *  - drag and drop writes a different number: `order` (Reviews page) or `homeOrder` (home page);
 *  - "Home reviews" has no tick box and cannot delete (deleting a review is done in "All reviews").
 * Both position numbers are declared (hidden) in both editors so saving in one never drops the other.
 *
 * Field names are the JSON keys and their ORDER is the key order Sveltia writes, so it must match the
 * files exactly (tests/unit/admin-config.test.ts round-trips the real files through these
 * definitions). Validation limits come from src/lib/reviews.ts.
 */
export const REVIEWS_FOLDER = 'src/content/reviews';

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
  siteHrefField,
  ...positionFields,
];

export const homeReviewFields: Field[] = [
  ...textFields,
  // Not editable here. Reviews created in this editor are ticked for the home page.
  { name: 'featured', widget: 'hidden', default: true },
  siteHrefField,
  ...positionFields,
];

/** Every key a review file may contain, in the order Sveltia writes them. */
export const REVIEW_KEYS = allReviewFields.map((field) => field.name);

/** Shown beside the collection title, so kept to one short sentence each. */
export const ALL_REVIEWS_HINT =
  'Every review. Reorder sets the Reviews page order. Tick one to show it on the home page.';
export const HOME_REVIEWS_HINT = `Shown on the home page (up to ${MAX_HOME_REVIEWS}). Reorder sets their order. To remove one, untick it in All reviews.`;
