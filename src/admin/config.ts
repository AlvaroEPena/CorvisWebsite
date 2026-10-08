import type { CmsConfig } from '@sveltia/cms';

import {
  ALL_REVIEWS_HINT,
  allReviewFields,
  HOME_REVIEWS_HINT,
  homeReviewFields,
  REVIEWS_FOLDER,
} from './reviews-fields';

const SITE_URL = 'https://thecorvis.com';

/**
 * Sveltia CMS configuration, typed and in code (no config.yml).
 *
 * Sign-in: there is deliberately no `base_url` (no OAuth proxy Worker). Without it Sveltia offers
 * "Sign In Using Access Token", so the single editor signs in with a GitHub fine-grained token
 * (see docs/admin-setup.md). Sveltia's config validation rejects `undefined` values, so optional
 * keys are only added when set.
 */
/** Both editors read and write the same one-file-per-review folder. */
const reviewFolder = {
  folder: REVIEWS_FOLDER,
  format: 'json',
  extension: 'json',
  identifier_field: 'company',
  summary: '{{name}} - {{company}}',
  // The preview pane repeats the form; one column is simpler to use.
  editor: { preview: false },
} as const;

export const config: CmsConfig = {
  load_config_file: false,
  backend: {
    name: 'github',
    repo: import.meta.env.PUBLIC_CMS_REPO || 'AlvaroEPena/CorvisWebsite',
    // Set PUBLIC_CMS_BRANCH to a branch name to try edits away from production.
    branch: import.meta.env.PUBLIC_CMS_BRANCH || 'main',
  },
  site_url: SITE_URL,
  display_url: SITE_URL,
  app_title: 'Corvis admin',
  // Reviews have no images; Sveltia still needs a media folder.
  media_folder: 'public/uploads',
  public_folder: '/uploads',
  // The optional site link is dropped when empty, so a save never adds `"siteHref": ""`.
  output: { omit_empty_optional_fields: true },
  collections: [
    {
      name: 'reviews',
      label: 'All reviews',
      label_singular: 'review',
      description: ALL_REVIEWS_HINT,
      icon: 'format_quote',
      ...reviewFolder,
      reorder: { key: 'order' },
      fields: allReviewFields,
    },
    {
      name: 'home-reviews',
      label: 'Home reviews',
      label_singular: 'review',
      description: HOME_REVIEWS_HINT,
      icon: 'home',
      ...reviewFolder,
      filter: { field: 'featured', value: true },
      reorder: { key: 'homeOrder' },
      // Deleting a review removes it everywhere, so that only happens in "All reviews".
      delete: false,
      fields: homeReviewFields,
    },
  ],
};
