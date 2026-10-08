import { describe, expect, it } from 'vitest';
import { faq } from '../../src/content/faq';
import { formatPrice } from '../../src/content/format';
import { managedPlan, pricing } from '../../src/content/pricing';
import { proofChips, proofStats } from '../../src/content/proof';
import { processSteps } from '../../src/content/process';
import { projects } from '../../src/content/projects';
import { redesignSample } from '../../src/content/redesign-demo';
import { sandboxProjects } from '../../src/content/sandbox';
import { services } from '../../src/content/services';
import { site } from '../../src/content/site';
import { testimonials } from '../../src/content/testimonials';
import {
  absoluteUrl,
  canonicalPath,
  faqJsonLd,
  professionalServiceJsonLd,
} from '../../src/layouts/seo';

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
  it('never emits ratings or reviews (placeholder testimonials)', () => {
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|ratingValue|review/i);
  });
});

describe('faqJsonLd', () => {
  it('mirrors the visible FAQ one to one', () => {
    const data = faqJsonLd(faq) as { mainEntity: { name: string }[] };
    expect(data.mainEntity.map((q) => q.name)).toEqual(faq.map((entry) => entry.question));
  });
});

describe('content invariants', () => {
  it('flags every placeholder price, testimonial and the sample redesign', () => {
    for (const item of [...pricing, managedPlan, ...testimonials, redesignSample]) {
      expect(item.placeholder).toBe(true);
    }
  });
  it('links every Work project to a sandbox project and sample copy never mentions removed ones', () => {
    const sandboxIds = sandboxProjects.map((project) => project.id);
    for (const project of projects) expect(sandboxIds).toContain(project.sandboxId);
    expect(JSON.stringify(testimonials)).not.toMatch(/saltwater/i);
  });
  it('keeps typography on plain hyphens (no em or en dashes in copy)', () => {
    const copy = JSON.stringify({
      site,
      services,
      projects,
      redesignSample,
      pricing,
      testimonials,
      faq,
    });
    expect(copy).not.toMatch(/[–—]/);
  });
  it('never uses the banned words in public copy', () => {
    const copy = JSON.stringify({
      site,
      services,
      projects,
      redesignSample,
      pricing,
      managedPlan,
      testimonials,
      faq,
      processSteps,
      proofStats,
      proofChips,
    });
    expect(copy).not.toMatch(/template|framework|\bAI\b/i);
  });
  it('keeps package ids in step with the checkout contract and mentions no phone routing', () => {
    expect(pricing.map((pkg) => pkg.id)).toEqual(['launchpad', 'market-leader']);
    expect(managedPlan.priceMonthly).toBe(149);
    expect(JSON.stringify({ pricing, faq, services })).not.toMatch(/routes|text message|nightly/i);
  });
  it('formats prices from data', () => {
    expect(formatPrice(5800)).toBe('$5,800');
  });
});
