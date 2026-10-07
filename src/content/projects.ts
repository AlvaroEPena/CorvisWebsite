export interface Project {
  name: string;
  category: string;
  summary: string;
  outcome: string;
  tone: 'indigo' | 'amber' | 'teal' | 'plum';
  /** Concept work shown until real case studies exist. */
  placeholder: true;
}

export const projects: readonly Project[] = [
  {
    name: 'Alder & Finch Landscaping',
    category: 'Website redesign',
    summary:
      'A dated brochure site turned into a seasonal quote machine with a gallery that loads instantly.',
    outcome: 'Quote requests moved from a buried page to the first screen.',
    tone: 'teal',
    placeholder: true,
  },
  {
    name: 'Kestrel Physio',
    category: 'New website build',
    summary:
      'A calm, accessible booking-first site for a new clinic, live before the doors opened.',
    outcome: 'Booking in two taps on a phone.',
    tone: 'indigo',
    placeholder: true,
  },
  {
    name: 'Marlowe Coffee Roasters',
    category: 'Brand-aligned landing page',
    summary:
      'A launch page for a subscription roast with a type-led layout and a one-field signup.',
    outcome: 'One page, one goal, no distractions.',
    tone: 'amber',
    placeholder: true,
  },
  {
    name: 'Brightwell Accounting',
    category: 'Redesign and care plan',
    summary:
      'A plain-spoken refresh for a local firm, with monthly care so it never goes stale again.',
    outcome: 'A site the partners are proud to send clients to.',
    tone: 'plum',
    placeholder: true,
  },
];
