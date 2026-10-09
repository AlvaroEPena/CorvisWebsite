// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import { defineConfig, fontProviders } from 'astro/config';
import { demosRouting } from './scripts/vite-demos-routing.mjs';

/** When the site last changed: the date of the latest commit (falls back to the build date). */
function lastChanged() {
  try {
    const date = new Date(
      execSync('git log -1 --format=%cI', { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim(),
    );
    if (!Number.isNaN(date.getTime())) return date;
  } catch {
    // Not a git checkout: use the build date.
  }
  return new Date();
}
const lastmod = lastChanged();

// Static output, deployed to Cloudflare Workers static assets (see wrangler.jsonc).
// The contact endpoint is a separate Worker (src/worker) served on /api/*.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://thecorvis.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      lastmod,
      filter: (page) => !page.endsWith('/thanks') && !/^https?:\/\/[^/]+\/admin(\/|$)/.test(page),
    }),
    demosRouting(),
  ],
  image: { layout: 'constrained' },
  vite: { plugins: [tailwindcss()] },
  // Self-hosted at build time by the Fonts API (no third-party request at runtime).
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Bricolage Grotesque',
      cssVariable: '--face-display',
      weights: ['700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'Arial', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--face-body',
      weights: ['400', '600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
