// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

// Static output, deployed to Cloudflare Workers static assets (see wrangler.jsonc).
// The contact endpoint is a separate Worker (src/worker) served on /api/*.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://thecorvis.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !page.endsWith('/thanks') })],
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
