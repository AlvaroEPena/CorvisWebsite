/** Business facts and global copy. Edit here; components never hard-code these. */
export const site = {
  name: 'Corvis',
  slogan: 'The Core Vision',
  url: 'https://thecorvis.com',
  title: 'Corvis | The Core Vision - Web design studio',
  description:
    'Corvis is a web design studio. We redesign existing websites and build new ones around the single idea that makes your business different. Book a free consult.',
  email: 'aaron@thecorvis.com',
  phone: '+1 801-784-0475',
  /** E.164 form for tel: links and structured data. */
  phoneE164: '+18017840475',
  owner: 'Aaron Peña-Diamond',
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
