import { describe, expect, it } from 'vitest';
import { faq } from '../../src/content/faq';
import { formatPrice } from '../../src/content/format';
import { managedPlan, pricing } from '../../src/content/pricing';
import { proofChips, proofStats } from '../../src/content/proof';
import { processSteps } from '../../src/content/process';
import { projects } from '../../src/content/projects';
import { sandboxProjects } from '../../src/content/sandbox';
import { services } from '../../src/content/services';
import { site } from '../../src/content/site';
import {
  absoluteUrl,
  canonicalPath,
  faqJsonLd,
  professionalServiceJsonLd,
  serializeJsonLd,
  verificationTags,
  websiteJsonLd,
} from '../../src/layouts/seo';
import { getAllReviews } from '../../src/lib/reviews';

const reviewsFile = getAllReviews();

const ORIGIN = 'https://corvis.example/';

describe('canonicalPath / absoluteUrl', () => {
  it('strips file-format suffixes', () => {
    expect(canonicalPath('/privacy.html')).toBe('/privacy');
    expect(canonicalPath('/index.html')).toBe('/');
    expect(canonicalPath('/')).toBe('/');
  });
  it('builds absolute URLs', () => {
    expect(absoluteUrl('/og.png', ORIGIN)).toBe('https://corvis.example/og.png');
  });
});

describe('professionalServiceJsonLd', () => {
  const data = professionalServiceJsonLd(site, services, ORIGIN);
  it('describes the business and lists every service', () => {
    expect(data['@type']).toBe('ProfessionalService');
    for (const service of services) expect(JSON.stringify(data)).toContain(service.title);
  });
  it('names both founders with their job titles', () => {
    expect(data.founder).toEqual([
      { '@type': 'Person', name: 'Alvaro Peña', jobTitle: 'Co-Founder & Tech Lead' },
      { '@type': 'Person', name: 'Aaron Peña-Diamond', jobTitle: 'Co-Founder & Vision Lead' },
    ]);
    expect(data.email).toBe(site.email);
    expect(data.telephone).toBe(site.phoneE164);
  });
  it('never emits ratings or reviews (placeholder testimonials)', () => {
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|ratingValue|review/i);
  });
  it('gives the logo as an image object and leaves out the price range', () => {
    expect(data.logo).toEqual({
      '@type': 'ImageObject',
      url: 'https://corvis.example/logo-512.png',
      width: 512,
      height: 512,
    });
    expect(data).not.toHaveProperty('priceRange');
  });
  it('only lists profile pages that are set in site.ts as sameAs', () => {
    expect(data).not.toHaveProperty('sameAs');
    const withProfile = professionalServiceJsonLd(
      { ...site, socials: { github: 'https://github.com/AlvaroEPena', empty: '' } },
      services,
      ORIGIN,
    );
    expect(withProfile.sameAs).toEqual(['https://github.com/AlvaroEPena']);
  });
});

describe('websiteJsonLd', () => {
  const data = websiteJsonLd(site, ORIGIN);
  it('names the site and its alternate names for Google', () => {
    expect(data).toMatchObject({
      '@type': 'WebSite',
      name: 'Corvis',
      alternateName: ['The Corvis', 'Corvis Web Design', 'thecorvis'],
      url: ORIGIN,
    });
  });
  it('points at the business entity as its publisher, with no ratings', () => {
    expect(data.publisher).toEqual({ '@id': `${ORIGIN}#business` });
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|ratingValue|review/i);
  });
});

describe('home page title and description', () => {
  it('names the studio in under 60 characters', () => {
    expect(site.title).toBe('Corvis | Web Design Studio for Local Businesses');
    expect(site.title.length).toBeLessThanOrEqual(60);
  });
  it('is 70 to 160 characters and mentions web design and local businesses', () => {
    expect(site.description.length).toBeGreaterThanOrEqual(70);
    expect(site.description.length).toBeLessThanOrEqual(160);
    expect(site.description).toMatch(/web design/i);
    expect(site.description).toMatch(/local businesses/i);
    expect(`${site.title} ${site.description}`).not.toMatch(/template|framework|\bAI\b/i);
  });
});

describe('structured data output', () => {
  const blocks = [
    websiteJsonLd(site, ORIGIN),
    professionalServiceJsonLd(site, services, ORIGIN),
    faqJsonLd(faq),
  ];
  it('is well-formed JSON that round-trips', () => {
    for (const block of blocks) expect(JSON.parse(serializeJsonLd(block))).toEqual(block);
  });
  it('can never close the script tag or start a comment', () => {
    const hostile = serializeJsonLd({ text: '</script><script>alert(1)</script> <!-- & \u2028' });
    expect(hostile).not.toMatch(/[<>&\u2028\u2029]/);
    expect(JSON.parse(hostile)).toEqual({
      text: '</script><script>alert(1)</script> <!-- & \u2028',
    });
  });
});

describe('verificationTags', () => {
  it('emits nothing when unset, empty or blank', () => {
    expect(verificationTags({})).toEqual([]);
    expect(verificationTags({ google: '', bing: '   ' })).toEqual([]);
  });
  it('emits one tag per configured value, trimmed', () => {
    expect(verificationTags({ google: ' abc123 ', bing: 'XYZ' })).toEqual([
      { name: 'google-site-verification', content: 'abc123' },
      { name: 'msvalidate.01', content: 'XYZ' },
    ]);
    expect(verificationTags({ bing: 'XYZ' })).toEqual([{ name: 'msvalidate.01', content: 'XYZ' }]);
  });
});

describe('faqJsonLd', () => {
  it('mirrors the visible FAQ one to one', () => {
    const data = faqJsonLd(faq) as { mainEntity: { name: string }[] };
    expect(data.mainEntity.map((q) => q.name)).toEqual(faq.map((entry) => entry.question));
  });
});

describe('content invariants', () => {
  it('flags every placeholder price', () => {
    for (const item of [...pricing, managedPlan]) {
      expect(item.placeholder).toBe(true);
    }
  });
  it('links every Work project to a sandbox project and sample copy never mentions removed ones', () => {
    const sandboxIds = sandboxProjects.map((project) => project.id);
    for (const project of projects) expect(sandboxIds).toContain(project.sandboxId);
    expect(JSON.stringify(reviewsFile)).not.toMatch(/saltwater row/i);
  });
  it('keeps typography on plain hyphens (no em or en dashes in copy)', () => {
    const copy = JSON.stringify({
      site,
      services,
      projects,
      pricing,
      reviewsFile,
      faq,
    });
    expect(copy).not.toMatch(/[–—]/);
  });
  it('never uses the banned words in public copy', () => {
    const copy = JSON.stringify({
      site,
      services,
      projects,
      pricing,
      managedPlan,
      reviewsFile,
      faq,
      processSteps,
      proofStats,
      proofChips,
    });
    expect(copy).not.toMatch(/template|framework|\bAI\b/i);
  });
  it('keeps the package ids and monthly price and mentions no phone routing', () => {
    expect(pricing.map((pkg) => pkg.id)).toEqual(['launchpad', 'market-leader']);
    expect(managedPlan.priceMonthly).toBe(274);
    expect(JSON.stringify({ pricing, faq, services })).not.toMatch(/routes|text message|nightly/i);
  });
  it('formats prices from data', () => {
    expect(formatPrice(5800)).toBe('5,800');
  });
});
