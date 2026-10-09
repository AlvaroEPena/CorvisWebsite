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
    priceFrom: 3800,
    unit: '',
    features: [
      {
        title: 'Up to 5 pages, fully written',
        text: 'Home, About, Services, Gallery and Contact. We write the words (up to 400 per page, two rounds of edits) so you never face a blank page.',
        footnote: 'Need more pages or longer copy? We quote it before we start.',
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
      {
        title: 'Instant email lead alerts',
        text: 'Your contact form emails you the moment someone writes, so no inquiry sits unseen.',
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
    priceFrom: 4940,
    unit: '',
    featuresLead: 'Everything in Launchpad, plus',
    features: [
      {
        title: 'Information visibility on up to 10 service and location pages',
        text: 'One page for each service you sell or town you serve, written so people searching for exactly that can find you and understand what you offer. Copy included, up to 400 words per page.',
      },
      {
        title: 'Frictionless lead capture',
        text: 'Smart forms on every one of those pages, each sending an instant email alert.',
      },
    ],
    featured: true,
    placeholder: true,
  },
];

/** The all-in care plan: the offering of both packages plus ongoing care, billed monthly. */
export const managedPlan = {
  id: 'care',
  name: 'Fully Managed Digital Infrastructure',
  /** Displayed on the badge above the name. */
  badge: 'Everything in both packages, and more',
  /** Per month, no currency symbol on the page. */
  priceMonthly: 274,
  summary:
    'Everything in The Launchpad Foundation and The Market Leader, kept running and improving for you, billed monthly so your new asset never depreciates. You never touch a server, a patch or a backup.',
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
