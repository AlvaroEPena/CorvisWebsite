import { site } from './site';

/**
 * Copy for /team. Easy to edit: change the words here, add a `photo` (a file in src/assets/team, AVIF
 * or WebP) to replace the initials monogram. Names and roles come from site.ts.
 */
export interface TeamPhoto {
  /** File name inside src/assets/team, with extension. */
  file: string;
  alt: string;
}

export interface TeamProfile {
  id: (typeof site.team)[number]['id'];
  /** Letters on the monogram avatar (both founders share initials, so first names are used). */
  monogram: string;
  /** One line: what this person does for a client. */
  summary: string;
  bio: readonly string[];
  /** Optional photo; the monogram shows until one is added. */
  photo?: TeamPhoto;
}

export const teamPage = {
  title: 'Meet the team | Corvis',
  description:
    'Corvis is two founders. Aaron is your point of contact from first call to launch, and Alvaro designs and builds your site.',
  heading: 'Meet the team.',
  lead: 'Two founders, one clear way of working. You talk to Aaron. Alvaro builds it.',
  teamLabel: 'The founders',
  workTitle: 'How we work together',
  steps: [
    {
      title: 'Aaron talks to you',
      text: 'He listens, scopes the project, agrees the price and sends the proposal.',
    },
    {
      title: 'Alvaro builds',
      text: 'He designs and builds your site, tests it on real phones and sets up hosting.',
    },
    {
      title: 'We launch and look after it',
      text: 'Your site goes live, then we keep it fast, secure and up to date.',
    },
  ],
  cta: {
    title: 'Ready to talk to Aaron?',
    text: 'Book a free consult. No pressure, and a plain-English answer on what we would build.',
    label: 'Book a free consult',
    href: '/#contact',
  },
} as const;

export const teamProfiles: readonly TeamProfile[] = [
  {
    id: 'alvaro',
    monogram: 'Al',
    summary: 'Designs and builds your site, and keeps it fast, hosted and secure.',
    bio: [
      'Alvaro is the founder and tech lead. He designs and builds every Corvis site by hand, from the first screen to launch day.',
      'He also looks after performance, hosting and security, so your site stays quick and safe after it goes live.',
    ],
  },
  {
    id: 'aaron',
    monogram: 'Aa',
    summary: 'Your point of contact for scoping, pricing, proposals and everything business.',
    bio: [
      'Aaron is the co-founder. He runs the business side and is the person you talk to, from your first call to launch day.',
      'He scopes the project with you, agrees pricing, sends the proposal and keeps everything moving, so you never have to chase anyone.',
    ],
  },
];
