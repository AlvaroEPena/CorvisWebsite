import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const corvisRoot = path.resolve(here, '..', '..');

/** Concept project; only ever READ by the demo build. The build happens in a scratch copy. */
export const sourceDir = process.env.DEMO_GRIT_SOURCE ?? path.resolve(corvisRoot, '..', 'grit');

/** Where the finished demo is synced (wiped first). */
export const targetDir = path.join(corvisRoot, 'public', 'demos', 'grit');

/**
 * Scratch workspace. `node_modules` lives in `<work>/node_modules` and the site copy in
 * `<work>/site`, so dependencies are installed once and reused (Node resolves upward).
 */
export const workDir = process.env.DEMO_GRIT_WORK ?? path.join(os.tmpdir(), 'corvis-demo-grit');
export const siteCopyDir = path.join(workDir, 'site');

/** Sub-path the demo is served from on the Corvis origin (no trailing slash for Astro). */
export const basePath = '/demos/grit';
/** Origin used for absolute URLs the build emits; the demo is same-origin with Corvis. */
export const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://thecorvis.com';

/** Dependencies the static build needs; versions are pinned from the source lockfile. */
export const buildDependencies = ['astro', 'sharp', 'tailwindcss', '@tailwindcss/vite', 'gsap'];

/** Not copied from the source tree. */
export const excludedSourceNames = new Set([
  'node_modules',
  'dist',
  '.git',
  '.astro',
  '.wrangler',
  '.claude',
  'test-results',
  'playwright-report',
]);

/** Removed from the scratch copy: tests, docs, tooling configs and hosting files. */
export const removedFromCopy = [
  'tests',
  'docs',
  'scripts',
  'README.md',
  'wrangler.jsonc',
  'playwright.config.ts',
  'vitest.config.ts',
  'eslint.config.js',
  'public/_headers',
  'public/robots.txt',
  'public/brand/og-image.svg',
];

/**
 * Image budget baked into the patched build (see source-patches.mjs). The hero is the widest
 * image the pages use, so it sets the cap; everything is AVIF.
 */
export const imageBuild = {
  /** Responsive widths Astro may emit (fewer than its default ladder). */
  breakpoints: [480, 800, 1200, 1600],
  /** Longest edge of the lightbox image. */
  lightboxEdge: 1600,
  /** AVIF quality for every photo. */
  quality: 50,
};

/** Shown instead of sending anything when a form is submitted. */
export const previewMessage = 'This is a preview. Nothing was sent.';
export const previewTitle = 'Preview only';
export const previewNote = 'No data left this page.';

/**
 * Strings that must not survive in the shipped files. Patterns, not plain substrings: "20M" and
 * "1996" must not match inside hashes, and "chad" must not match inside longer words.
 */
export const forbiddenLeftovers = [
  { label: 'protech', pattern: /protech/i },
  { label: 'protechcoatings', pattern: /protechcoatings/i },
  { label: 'chad', pattern: /\bchad\b/i },
  { label: 'diamond', pattern: /\bdiamond\b/i },
  { label: '1996', pattern: /\b1996\b/ },
  { label: '20M', pattern: /\b20\s?M\b/ },
  { label: '20 million', pattern: /\b20 million\b/i },
  { label: 'googletagmanager', pattern: /googletagmanager/i },
  { label: 'gtag(', pattern: /gtag\(/i },
  { label: 'doubleclick', pattern: /doubleclick/i },
  { label: '/api/', pattern: /\/api\//i },
  { label: 'sourceMappingURL', pattern: /sourceMappingURL/ },
  { label: 'sitemap', pattern: /sitemap/i },
];

/** Pages the crawl and the leftover scan expect (extensionless URLs; '' is the home page). */
export const expectedPages = [
  '',
  'about',
  'about/health-safety',
  'services',
  'services/deck-overlays',
  'services/waterproofing-membranes',
  'services/concrete-repair-coatings',
  'services/carbon-fiber-strengthening',
  'services/expansion-joints',
  'services/overlay-removal',
  'services/high-friction-surfaces',
  'services/mastic-repair',
  'services/cross-stitching',
  'services/industrial-coatings',
  'licenses-certifications',
  'projects',
  'projects/i-90-river-crossing',
  'projects/state-route-12-hfst',
  'projects/harbor-viaduct-membrane',
  'projects/creek-bridge-cfrp',
  'projects/county-line-joints',
  'projects/refinery-containment',
  'contact',
  'careers',
  'careers/deck-crew-laborer',
  'careers/equipment-operator',
  'careers/project-superintendent',
  '404',
];
