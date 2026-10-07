export interface PricingPackage {
  id: string;
  name: string;
  /** Lowest price in USD. Rendered as "Starting at". */
  priceFrom: number;
  /** Suffix after the price, e.g. a monthly cadence. Empty for one-off projects. */
  unit: string;
  blurb: string;
  features: readonly string[];
  featured: boolean;
  /** Placeholder figures until the owner confirms real pricing. */
  placeholder: true;
}

export const pricing: readonly PricingPackage[] = [
  {
    id: 'launch',
    name: 'Launch',
    priceFrom: 2400,
    unit: '',
    blurb: 'A sharp, fast site for a business that needs to be online and credible.',
    features: [
      'Up to 5 pages',
      'Mobile-first design',
      'Contact form and basic SEO',
      '30 days of support',
    ],
    featured: false,
    placeholder: true,
  },
  {
    id: 'redesign',
    name: 'Full Redesign',
    priceFrom: 5800,
    unit: '',
    blurb: 'The complete rebuild: strategy, design, migration and launch.',
    features: [
      'Site audit and content plan',
      'Custom design system',
      'Up to 12 pages',
      'Redirects and SEO migration',
      '60 days of support',
    ],
    featured: true,
    placeholder: true,
  },
  {
    id: 'care',
    name: 'Care & Growth',
    priceFrom: 190,
    unit: '/ month',
    blurb: 'Ongoing care so your site keeps getting better after launch.',
    features: [
      'Hosting and security',
      'Monthly improvement sprint',
      'Fixes within a working day',
      'Performance reporting',
    ],
    featured: false,
    placeholder: true,
  },
];
