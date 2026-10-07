export interface Service {
  id: string;
  title: string;
  summary: string;
  points: readonly string[];
  /** Visual treatment of its bento cell. */
  tone: 'core' | 'vision' | 'glass' | 'teal';
}

export const services: readonly Service[] = [
  {
    id: 'redesign',
    title: 'Website Redesign',
    summary:
      'Keep what already works, rebuild what does not. Same business, a site that finally looks and performs like it.',
    points: [
      'Audit of content, speed and search',
      'New design and structure',
      'Redirects that protect your rankings',
    ],
    tone: 'core',
  },
  {
    id: 'new-build',
    title: 'New Website Build',
    summary:
      'From a blank page to a live site, designed around how your customers actually decide.',
    points: ['Strategy, copy direction and design', 'Hand-built, no page-builder bloat'],
    tone: 'vision',
  },
  {
    id: 'care-plan',
    title: 'Care & Growth plan',
    summary:
      'Hosting, security, updates and a steady stream of small improvements, handled monthly.',
    points: ['Fixes within a working day', 'Monthly improvement sprint'],
    tone: 'glass',
  },
  {
    id: 'landing-pages',
    title: 'Brand-aligned landing pages',
    summary:
      'Focused single pages for a launch, an offer or a campaign, built to match your brand exactly.',
    points: ['Ready fast', 'Built to convert'],
    tone: 'teal',
  },
];
