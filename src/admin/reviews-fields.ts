import type { Field } from '@sveltia/cms';

import { QUOTE_MAX_LENGTH, QUOTE_MIN_LENGTH } from '../lib/reviews';

/**
 * The editor's fields for src/content/reviews.json. Field names are the JSON keys and their ORDER
 * is the key order Sveltia writes, so it must match the file exactly (tests/unit/admin-config.test.ts
 * round-trips the real file through these definitions). Validation limits come from src/lib/reviews.ts.
 */
export const REVIEWS_FILE = 'src/content/reviews.json';

export const reviewFields: Field[] = [
  {
    // Generated for new entries; existing ids are kept. Never shown: it is not for editing.
    name: 'id',
    widget: 'uuid',
    prefix: 'review-',
  },
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
  {
    name: 'featured',
    label: 'Show on the home page',
    widget: 'boolean',
    default: false,
    hint: 'At most six reviews can appear on the home page.',
  },
  {
    name: 'siteHref',
    label: 'Link to their new site',
    widget: 'string',
    required: false,
    hint: 'Link to their new site; leave empty to show a disabled button.',
  },
];

export const reviewsFileFields: Field[] = [
  {
    name: 'reviews',
    label: 'Reviews',
    widget: 'list',
    label_singular: 'review',
    hint: 'Drag to reorder: this is the order on the Reviews page. Tick "Show on the home page" for the ones to feature.',
    min: 1,
    collapsed: true,
    summary: '{{name}} - {{company}}',
    fields: reviewFields,
  },
];
