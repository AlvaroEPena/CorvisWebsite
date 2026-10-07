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
  description: string;
  email: string;
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
    image: absoluteUrl('/og.png', origin),
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
