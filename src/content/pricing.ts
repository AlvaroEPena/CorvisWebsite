export interface PackageFeature {
  title: string;
  text: string;
  /** Small qualifier shown beneath the text (e.g. what the timeline depends on). */
  footnote?: string;
}

export interface PricingPackage {
  id: string;
  name: string;
  /** Who the package is for. */
  audience: string;
  pitch: string;
  /** Lowest price in USD. Rendered as "Starting at". */
  priceFrom: number;
  /** Suffix after the price, e.g. a monthly cadence. Empty for one-off projects. */
  unit: string;
  /** Lead-in line above the feature list, e.g. "Everything in Launchpad, plus". */
  featuresLead?: string;
  features: readonly PackageFeature[];
  featured: boolean;
  /** Placeholder figures until the owner confirms real pricing. */
  placeholder: true;
}

export const pricing: readonly PricingPackage[] = [
  {
    id: 'launchpad',
    name: 'The Launchpad Foundation',
    audience: 'For the successful local business that customers cannot find online yet.',
    pitch:
      'Stop losing referrals to competitors just because they have a website. We launch your fully branded, conversion-optimized digital presence in 14 days.',
    priceFrom: 4500,
    unit: '',
    features: [
      {
        title: 'Done-for-you copywriting',
        text: 'You run your business; we write the words. Professional, industry-specific copywriting is included in every build.',
      },
      {
        title: 'Rapid deployment',
        text: 'A 14-day turnaround from kickoff to live.',
        footnote: '14 days counts from kickoff, once your content and approvals are in.',
      },
      {
        title: 'Mobile-first architecture',
        text: 'Built specifically for customers searching on their phones.',
      },
    ],
    featured: false,
    placeholder: true,
  },
  {
    id: 'market-leader',
    name: 'The Market Leader',
    audience: 'For businesses ready to capture local search traffic and automate lead generation.',
    pitch:
      'Dominate your local market with a robust digital hub designed to capture, educate, and convert high-value leads.',
    priceFrom: 6800,
    unit: '',
    featuresLead: 'Everything in Launchpad, plus',
    features: [
      {
        title: 'Expanded footprint',
        text: 'Up to 10 dedicated service and location pages to capture targeted local search traffic.',
      },
      {
        title: 'Frictionless lead capture',
        text: 'Integrated smart forms with spam protection and instant email alerts, so no inquiry sits unseen.',
      },
    ],
    featured: true,
    placeholder: true,
  },
];

/** Mandatory care plan, presented as part of both packages (required, billed monthly). It has no checkout. */
export const managedPlan = {
  id: 'care',
  name: 'Fully Managed Digital Infrastructure',
  /** USD per month. */
  priceMonthly: 149,
  summary:
    'Part of both packages and billed monthly, so your new asset never depreciates. You never touch a server, a patch or a backup.',
  points: [
    {
      title: 'Premium global hosting',
      text: 'Your site is served from a fast worldwide network, with no server for you to manage.',
    },
    {
      title: 'Proactive security',
      text: 'We keep the site patched and protected so threats are handled before you notice them.',
    },
    {
      title: 'Versioned backups, one-click rollback',
      text: 'Every change is saved as a version, so any mistake can be undone in a click.',
    },
  ],
  placeholder: true,
} as const;
