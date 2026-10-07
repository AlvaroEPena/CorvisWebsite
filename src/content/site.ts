/** Business facts and global copy. Edit here; components never hard-code these. */
export const site = {
  name: 'Corvis',
  slogan: 'The Core Vision',
  url: 'https://corvis.example',
  title: 'Corvis | The Core Vision - Web design studio',
  description:
    'Corvis is a web design studio. We redesign existing websites and build new ones around the single idea that makes your business different. Book a free consult.',
  /** Placeholder until the owner supplies a real address. */
  email: 'hello@corvis.example',
  socials: {} as Record<string, string>,
  cta: { label: 'Book a free consult', href: '#contact' },
  secondaryCta: { label: 'See our work', href: '#work' },
  navigation: [
    { label: 'Services', href: '#services' },
    { label: 'Work', href: '#work' },
    { label: 'Redesign', href: '#redesign' },
    { label: 'Process', href: '#process' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
  hero: {
    badge: 'Web design studio',
    lead: 'Corvis designs and builds fast, striking websites around the one idea that makes your business different.',
  },
} as const;
