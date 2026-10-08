import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const corvisRoot = path.resolve(here, '..', '..');

/** Owner's own project; only ever READ. The build happens in a scratch copy. */
export const sourceDir =
  process.env.DEMO_MODLABS_SOURCE ?? path.resolve(corvisRoot, '..', 'mod-labs');

/** Where the finished demo is synced (wiped first). */
export const targetDir = path.join(corvisRoot, 'public', 'demos', 'mod-labs');

/**
 * Scratch workspace. `node_modules` lives in `<work>/node_modules` and the site copy in
 * `<work>/site`, so dependencies are installed once and reused (Node resolves upward).
 */
export const workDir =
  process.env.DEMO_MODLABS_WORK ?? path.join(os.tmpdir(), 'corvis-demo-modlabs');
export const siteCopyDir = path.join(workDir, 'site');

/** Sub-path the demo is served from on the Corvis origin (no trailing slash for Astro). */
export const basePath = '/demos/mod-labs';
/** Origin used for absolute URLs the build emits; the demo is same-origin with Corvis. */
export const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://thecorvis.com';

/** Dependencies the static build needs; versions are pinned from the source lockfile. */
export const buildDependencies = [
  'astro',
  'sharp',
  'photoswipe',
  'tailwindcss',
  '@tailwindcss/vite',
  'zod',
];

/** Not copied from the source tree. */
export const excludedSourceNames = new Set([
  'node_modules',
  'dist',
  '.git',
  '.astro',
  '.wrangler',
  '.claude',
  '.admin-trash',
  'test-results',
  'playwright-report',
]);

/** Removed from the scratch copy: local admin, Worker, tests, hosting files, third-party embeds. */
export const removedFromCopy = [
  'admin',
  'worker',
  'tests',
  'docs',
  'scripts',
  'wrangler.jsonc',
  'playwright.config.ts',
  'vitest.config.ts',
  'eslint.config.js',
  'src/components/forms/Turnstile.astro',
  'src/pages/robots.txt.ts',
  'public/_headers',
  'public/_redirects',
  'public/media',
  'public/og.png',
  'public/site.webmanifest',
];

/** Image budget baked into the patched build (see source-patches.mjs). */
export const imageBuild = {
  /** Widest responsive variant any photo may emit. */
  maxWidth: 960,
  /** Longest edge of the lightbox image. */
  lightboxEdge: 1200,
  /** AVIF quality for thumbnails and lightbox images. */
  quality: 50,
};

/** Gallery trimming: first N photos per project, plus every photo the pages hand-pick by id. */
export const galleryTrim = { photosPerProject: 8 };

/** Shown instead of sending anything when a form is submitted. */
export const previewMessage =
  'This is a preview. Nothing was sent. On the live site this sends your request to Mod Labs.';

/** Strings that must not survive in the shipped files (case-insensitive). */
export const forbiddenLeftovers = [
  'turnstile',
  'challenges.cloudflare',
  'resend',
  '/api/',
  'googletagmanager',
  'gtag(',
  'doubleclick',
  '/admin',
  'ffmpeg',
  'sitemap',
  'sourceMappingURL',
];

/**
 * Words that may appear as plain text on specific pages. The privacy policy is real copy that
 * names the live site's spam check and email provider; it is text, not a script or request.
 */
export const allowedLeftovers = { 'privacy.html': ['turnstile', 'resend'] };

/** Pages the crawl and the leftover scan expect to exist (extensionless URLs). */
export const expectedPages = [
  '',
  'services',
  'builds',
  'gallery',
  'gallery/switch',
  'gallery/xbox',
  'gallery/playstation',
  'gallery/custom',
  'gallery/repairs',
  'about',
  'faq',
  'quote',
  'book',
  'privacy',
  'terms',
  '404',
];
