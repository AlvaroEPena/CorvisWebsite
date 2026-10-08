/** Business facts and global copy. Edit here; components never hard-code these. */
export const site = {
  name: 'Corvis',
  slogan: 'The Core Vision',
  /** Other names people search for; sent to Google as the site's alternate names. */
  alternateNames: ['The Corvis', 'Corvis Web Design', 'thecorvis'],
  url: 'https://thecorvis.com',
  /** Home page <title>: the studio's name and what it is, under 60 characters. */
  title: 'Corvis | Web Design Studio for Local Businesses',
  description:
    'Corvis is a web design studio for local businesses. We write, build, launch and manage a fast, branded website in 14 days. Book a free consult.',
  email: 'aaron@thecorvis.com',
  phone: '+1 801-784-0475',
  /** E.164 form for tel: links and structured data. */
  phoneE164: '+18017840475',
  /** Founders, in the order shown. Phone and email above are Aaron's: he is the point of contact. */
  team: [
    { id: 'alvaro', name: 'Alvaro Peña', role: 'Founder & Tech Lead' },
    { id: 'aaron', name: 'Aaron Peña-Diamond', role: 'Co-Founder' },
  ],
  socials: {} as Record<string, string>,
  cta: { label: 'Book a free consult', href: '#contact' },
  secondaryCta: { label: 'See our work', href: '#work' },
  navigation: [
    { label: 'Services', href: '#services' },
    { label: 'Work', href: '#work' },
    { label: 'Process', href: '#process' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Meet the team', href: '/team' },
    { label: 'Sandbox', href: '/sandbox' },
    { label: 'Reviews', href: '/reviews' },
  ],
  /** Footer keeps the Sandbox link next to the work it shows, ahead of Process. */
  footerNavigation: [
    { label: 'Services', href: '#services' },
    { label: 'Work', href: '#work' },
    { label: 'Sandbox', href: '/sandbox' },
    { label: 'Process', href: '#process' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Meet the team', href: '/team' },
    { label: 'Reviews', href: '/reviews' },
  ],
  hero: {
    badge: 'Done-For-You Digital Real Estate',
    lead: 'We launch and manage your online presence in 14 days, so customers find you and you stay hands-off.',
  },
} as const;
