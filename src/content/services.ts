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
    id: 'new-build',
    title: 'Done-For-You New Website',
    summary:
      'A fully branded, conversion-optimized site with the writing included. You run the business; we handle every word and pixel.',
    points: [
      'Industry-specific copywriting',
      'Live 14 days from kickoff',
      'Built for phones first',
    ],
    tone: 'core',
  },
  {
    id: 'local-search',
    title: 'Local Search Growth',
    summary:
      'Dedicated service and location pages that put you in front of customers searching in your area, plus forms that alert you instantly.',
    points: ['Up to 10 service and location pages', 'Instant email lead alerts'],
    tone: 'vision',
  },
  {
    id: 'care-plan',
    title: 'Fully Managed Digital Infrastructure',
    summary:
      'Premium hosting, proactive security and versioned backups, handled for you so the site never depreciates.',
    points: ['Hosting included', 'One-click rollback'],
    tone: 'glass',
  },
  {
    id: 'redesign',
    title: 'Website Redesign',
    summary:
      'Already have a site that looks tired? We keep what works and rebuild the rest around your core idea.',
    points: ['Content and speed audit', 'Redirects that protect your traffic'],
    tone: 'teal',
  },
];
