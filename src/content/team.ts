import { site } from './site';

/**
 * Copy for /team. Easy to edit: change the words here. Names and roles come from site.ts.
 * Photos are not set here: drop `<id>-card.avif` and `<id>-avatar.avif` into src/assets/team (made
 * with scripts/make-team-photos.mjs) and they replace the designed placeholder automatically.
 */
export interface TeamProfile {
  id: (typeof site.team)[number]['id'];
  /** Letters on the monogram avatar (both founders share initials, so first names are used). */
  monogram: string;
  /** One line: what this person does for a client. */
  summary: string;
  bio: readonly string[];
}

/** Alt text for a real photo, from the facts in site.ts: "Alvaro Peña, Founder and Tech Lead". */
export const photoAltOf = (member: { name: string; role: string }): string =>
  `${member.name}, ${member.role.replace(' & ', ' and ')}`;

/** The "Meet the team" call to action under the home page reviews. */
export const teamTeaser = {
  label: 'Meet the team',
  text: 'Two founders, one point of contact',
  href: '/team',
} as const;

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
