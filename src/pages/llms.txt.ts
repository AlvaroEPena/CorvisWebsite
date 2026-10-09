import type { APIRoute } from 'astro';

import { managedPlan, pricing } from '../content/pricing';
import { servicePages } from '../content/service-pages';
import { site } from '../content/site';
import { formatPrice } from '../content/format';

/**
 * A plain-text summary for AI assistants and crawlers (llms.txt). Generated from the same content
 * modules as the site, so prices and services here can never drift from the pages.
 */
export const GET: APIRoute = ({ site: origin }) => {
  const base = (origin ?? new URL(site.url)).toString().replace(/\/$/, '');
  const packages = pricing
    .map((pkg) => `- ${pkg.name}: from ${formatPrice(pkg.priceFrom)} (US dollars). ${pkg.audience}`)
    .join('\n');
  const services = servicePages
    .map((page) => `- [${page.name}](${base}/services/${page.slug}): ${page.description}`)
    .join('\n');
  const body = `# ${site.name}

> ${site.coverage.definition} We write, build, launch and manage a fast, branded website in 14 days, with the copywriting included.

${site.coverage.summary} Recent work: ${site.coverage.cities.join(', ')}. Corvis is a remote studio and does not publish a street address.

## Services

${services}

## Packages and pricing

${packages}
- ${managedPlan.name}: ${formatPrice(managedPlan.priceMonthly)} per month (US dollars). Combines both packages with hosting, security and versioned backups.

Prices are starting points. A fixed quote follows a free consult.

## Pages

- [Home](${base}/): services, work, process, pricing, FAQ and contact form
- [Meet the team](${base}/team): the two founders, ${site.team.map((member) => `${member.name} (${member.role})`).join(' and ')}
- [Sandbox](${base}/sandbox): test drive finished websites at desktop, tablet and phone widths

## Contact

- Email: ${site.email}
- Phone: ${site.phone}
- Book a free consult: ${base}/#contact
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
