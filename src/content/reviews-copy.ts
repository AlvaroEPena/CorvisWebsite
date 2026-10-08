/** Copy for /reviews. The reviews themselves live in reviews.json (edited in /admin). */
export const reviewsPage = {
  title: 'Client reviews | Corvis',
  description:
    'What business owners say about working with Corvis: fast launches, copy written for them, local search pages and hosting that just works.',
  heading: 'What clients say.',
  lead: 'Owners of small local businesses, in their own words, on launching with Corvis and what changed after.',
  viewSite: 'View their new site',
  comingSoon: 'Coming soon',
  homeLink: { label: 'Back to the reviews on the home page', href: '/#testimonials' },
  cta: {
    title: 'Want a site your customers talk about?',
    text: 'Book a free consult and tell us about your business. We will show you what we would build.',
    label: 'Book a free consult',
    href: '/#contact',
  },
} as const;
