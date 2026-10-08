import type { FaqEntry } from '../content/faq';
import type { Service } from '../content/services';

type JsonLd = Record<string, unknown>;

/** `build.format: 'file'` yields `/privacy.html`, but pages are served at `/privacy`. */
export function canonicalPath(pathname: string): string {
  return pathname.replace(/(\/index)?\.html$/, '') || '/';
}

export function absoluteUrl(path: string, origin: string): string {
  return new URL(path, origin).toString();
}

interface BusinessFacts {
  name: string;
  alternateNames?: readonly string[];
  description: string;
  email: string;
  phoneE164: string;
  team: readonly { name: string; role: string }[];
  socials: Record<string, string>;
}

/** No aggregateRating or review markup: testimonials and projects are placeholders. */
export function professionalServiceJsonLd(
  business: BusinessFacts,
  services: readonly Service[],
  origin: string,
): JsonLd {
  const sameAs = Object.values(business.socials).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${origin}#business`,
    name: business.name,
    description: business.description,
    url: origin,
    email: business.email,
    telephone: business.phoneE164,
    founder: business.team.map((member) => ({
      '@type': 'Person',
      name: member.name,
      jobTitle: member.role,
    })),
    image: absoluteUrl('/og.png', origin),
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/logo-512.png', origin),
      width: 512,
      height: 512,
    },
    areaServed: 'Worldwide',
    ...(sameAs.length > 0 ? { sameAs } : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Web design services',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: service.title, description: service.summary },
      })),
    },
  };
}

/**
 * The site's own name for Google (the "site name" shown above results). `publisher` points at the
 * business entity, so the two are understood as one organisation. Add profile pages (LinkedIn,
 * GitHub, Google Business Profile) to `socials` in src/content/site.ts; they flow into `sameAs`.
 */
export function websiteJsonLd(business: BusinessFacts, origin: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}#website`,
    name: business.name,
    ...(business.alternateNames?.length ? { alternateName: [...business.alternateNames] } : {}),
    url: origin,
    inLanguage: 'en',
    publisher: { '@id': `${origin}#business` },
  };
}

/** JSON for a <script type="application/ld+json">: `<`, `>` and `&` escaped so it can never close the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export interface VerificationEnv {
  google?: string;
  bing?: string;
}

/**
 * Search engine site-verification <meta> tags, only for values that are set. Astro escapes the
 * attribute values when they are rendered.
 */
export function verificationTags(env: VerificationEnv): { name: string; content: string }[] {
  const tags = [
    { name: 'google-site-verification', content: env.google?.trim() ?? '' },
    { name: 'msvalidate.01', content: env.bing?.trim() ?? '' },
  ];
  return tags.filter((tag) => tag.content !== '');
}

export function faqJsonLd(entries: readonly FaqEntry[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
