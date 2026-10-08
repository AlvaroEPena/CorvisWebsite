import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const corvisRoot = path.resolve(here, '..', '..');

/** Owner's own project; only ever READ. The build happens in a scratch copy. */
export const sourceDir =
  process.env.DEMO_REFINED_SOURCE ?? path.resolve(corvisRoot, '..', 'refined-celebrations');

/** Where the finished demo is synced (wiped first). */
export const targetDir = path.join(corvisRoot, 'public', 'demos', 'refined-celebrations');

/**
 * Scratch workspace. `node_modules` lives in `<work>/node_modules` and the site copy in
 * `<work>/site`, so dependencies are installed once and reused (Node resolves upward).
 */
export const workDir =
  process.env.DEMO_REFINED_WORK ?? path.join(os.tmpdir(), 'corvis-demo-refined');
export const siteCopyDir = path.join(workDir, 'site');

/** Sub-path the demo is served from on the Corvis origin (no trailing slash for Astro). */
export const basePath = '/demos/refined-celebrations';
/** Origin used for og:image and similar absolute URLs; the demo is same-origin with Corvis. */
export const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://thecorvis.com';

/** Dependencies the static build needs; versions are pinned from the source lockfile. */
export const buildDependencies = ['astro', 'sharp', 'photoswipe'];

/** Not copied from the source tree. */
export const excludedSourceNames = new Set([
  'node_modules',
  'dist',
  '.git',
  '.astro',
  'test-results',
  'playwright-report',
  '.wrangler',
  '.claude',
]);

/** Removed from the scratch copy: CMS, tests, analytics, third-party embed code, hosting files. */
export const removedFromCopy = [
  'src/pages/admin',
  'src/admin',
  'src/components/analytics',
  'src/scripts/honeybook.ts',
  'public/_headers',
  'public/_redirects',
  'public/robots.txt',
  'tests',
  'docs',
  'wrangler.jsonc',
  'playwright.config.ts',
  'vitest.config.ts',
  'eslint.config.js',
];

/** Build-time image settings patched into the scratch copy (see source-patches.mjs). */
export const imageBuild = { maxWidth: 1600, lightboxWidth: 1200, quality: 50 };

export const imageLimits = {
  /** Longest side kept for any raster in the output. */
  maxWidth: 1600,
  /** Re-encode targets; only kept when at least 10% smaller than the build's own output. */
  quality: { avif: 55, webp: 68, jpg: 70 },
};

/** Hosts a demo page may never contact. */
export const forbiddenHostFragments = [
  'googletagmanager',
  'google-analytics',
  'googleadservices',
  'doubleclick',
  'googlesyndication',
  'honeybook',
  'hbportal',
  'cloudfront',
  'google.com',
  'gstatic',
  'googleapis',
];

/** Strings that must not survive anywhere in the shipped files. */
export const forbiddenLeftovers = [
  'googletagmanager',
  'gtag(',
  'doubleclick',
  'honeybook',
  'hbportal',
  '/admin',
  'sveltia',
];

export const inquiryPanelText =
  'The inquiry form is turned off in this preview. On the live site this is where couples request a consult.';
