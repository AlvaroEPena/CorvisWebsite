/** Business facts and global copy. Edit here; components never hard-code these. */
export const site = {
  name: 'Corvis',
  slogan: 'The Core Vision',
  url: 'https://thecorvis.com',
  title: 'Corvis | The Core Vision - Done-For-You Digital Real Estate',
  description:
    'Corvis is your done-for-you digital growth partner. We write, build, launch and manage a fast, branded website for local businesses in 14 days. Book a free consult.',
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
    { label: 'Sandbox', href: '/sandbox' },
    { label: 'Process', href: '#process' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
  hero: {
    badge: 'Done-For-You Digital Real Estate',
    lead: 'We launch and manage your online presence in 14 days, so customers find you and you stay hands-off.',
  },
} as const;
