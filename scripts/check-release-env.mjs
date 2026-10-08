// Run before every production deploy (`npm run deploy` calls it). Fails on placeholder config
// that would silently break or mislead a live site. Not run in dev, e2e, or plain `npm run build`.
import { readFileSync } from 'node:fs';

const problems = [];
if (/\.example/.test(readFileSync('src/content/site.ts', 'utf8'))) {
  problems.push('src/content/site.ts still contains placeholder .example URL/email.');
}
const siteUrl = process.env.PUBLIC_SITE_URL ?? '';
if (!siteUrl || /\.example|localhost/.test(siteUrl)) {
  problems.push('PUBLIC_SITE_URL must be the real https URL (canonicals, sitemap, OG use it).');
}
if (!process.env.PUBLIC_TURNSTILE_SITE_KEY) {
  problems.push(
    'PUBLIC_TURNSTILE_SITE_KEY must be set at build time, or the contact form fails on a real secret.',
  );
}
if (problems.length > 0) {
  console.error('Release check failed:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('Release check passed.');
