/**
 * Portfolio entries for the Work section. Add a project by appending to `projects`: the section
 * stacks each entry as a showcase (a browser-window preview built from `preview` and `photos`, plus
 * the case summary). `sandboxId` must match an entry in src/content/sandbox.ts so the same project
 * can be test driven on /sandbox.
 *
 * DATA NOTE: Refined Celebrations & Co. is a site we designed and built from scratch. The owner
 * confirmed we may show it with its real name, copy and photographs (photos live in
 * src/assets/portfolio/refined/, re-encoded by scripts/optimize-refined.mjs).
 */
export interface WorkPhoto {
  /** File name (without extension) inside the project's folder in src/assets/portfolio. */
  file: string;
  alt: string;
}

export interface PreviewService {
  title: string;
  text: string;
}

/** Real copy of the finished site, laid out top to bottom by components/mocks/SitePreview.astro. */
export interface SitePreviewContent {
  domain: string;
  brand: string;
  nav: readonly string[];
  eyebrow: string;
  headline: string;
  subline: string;
  primaryCta: string;
  secondaryCta: string;
  /** Photo file names from `photos`. */
  heroPhoto: string;
  strip: readonly string[];
  aboutTitle: string;
  aboutText: string;
  aboutPhoto: string;
  servicesTitle: string;
  services: readonly PreviewService[];
  galleryTitle: string;
  galleryPhotos: readonly string[];
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
  /** Brand colors of the finished site, so the preview looks like the real thing. */
  theme: { ink: string; paper: string; accent: string; accentSoft: string };
}

export interface WorkProject {
  id: string;
  /** Id of the matching project in src/content/sandbox.ts. */
  sandboxId: string;
  name: string;
  category: string;
  /** Chip on the card. */
  label: string;
  /** Folder name inside src/assets/portfolio. */
  folder: string;
  /** What we built and why it works, in plain language. */
  summary: string;
  built: readonly string[];
  whyItWorks: readonly string[];
  /** One line saying whether this replaced an older site. */
  originNote: string;
  photos: readonly WorkPhoto[];
  preview: SitePreviewContent;
}

export const projects: readonly WorkProject[] = [
  {
    id: 'refined-celebrations',
    sandboxId: 'refined-celebrations',
    name: 'Refined Celebrations & Co.',
    category: 'New website design',
    label: 'Live project',
    folder: 'refined',
    summary:
      'A boutique wedding, corporate and event planning company with its own photography, serving Indianapolis and Salt Lake City. Its website had to feel as considered as the celebrations it plans.',
    built: [
      'A photo-led home page that opens on a real reception',
      'Separate pages for event planning and for photography, each with its own services',
      'Portfolio pages for photography, events, weddings and stationery',
      'Short chat pages that start an inquiry in one step',
    ],
    whyItWorks: [
      'Real celebrations do the selling, so guests see the work before they read a word.',
      'Two services, two clear paths: planning and photography never compete for attention.',
      'Lean pages and sized images keep it quick on a phone, where most couples browse.',
    ],
    originNote: 'A brand-new design, built from scratch. There is no earlier version of this site.',
    photos: [
      {
        file: 'reception-toast',
        alt: 'Wedding guests gathered around a champagne tower in a softly lit chapel-style reception hall',
      },
      {
        file: 'wedding-gown-window',
        alt: 'A wedding gown hanging in a tall arched window beneath a black chandelier, in black and white',
      },
      {
        file: 'wedding-flatlay',
        alt: 'A wedding invitation suite, florals and details arranged on dark stone, in black and white',
      },
      {
        file: 'wedding-gown-back',
        alt: 'The back of a lace wedding gown with a long train, in a bridal salon',
      },
      {
        file: 'gift-basket',
        alt: 'A curated gift basket tied with a navy ribbon, sitting on a black side table',
      },
    ],
    preview: {
      domain: 'refinedcelebrations.co',
      brand: 'Refined Celebrations & Co.',
      nav: ['Home', 'Our Team', 'Our Offerings', 'Portfolios', 'Reach Out'],
      eyebrow: 'Indianapolis and Salt Lake City',
      headline: 'Thoughtful design, unforgettable moments.',
      subline: 'Boutique Wedding, Corporate & Event Planning and Photography',
      primaryCta: 'Explore Services',
      secondaryCta: 'View Portfolio',
      heroPhoto: 'reception-toast',
      strip: [
        'Wedding Planning',
        'Corporate & Non-Profit',
        'Birthdays & Celebrations',
        'Photography',
      ],
      aboutTitle: 'Every detail, with intention.',
      aboutText:
        'Refined Celebrations & Co. is a boutique wedding, corporate, and event planning company serving Indianapolis and Salt Lake City. We offer comprehensive event planning and professional photography services for weddings, events, families, and couples.',
      aboutPhoto: 'wedding-flatlay',
      servicesTitle: 'Our Services',
      services: [
        {
          title: 'Weddings',
          text: 'We plan and manage weddings from start to finish, handling logistics, design, and vendor coordination so you can fully enjoy your day.',
        },
        {
          title: 'Events',
          text: 'We handle every aspect of your event so you can focus on hosting, from corporate gatherings to private celebrations.',
        },
        {
          title: 'Invitations',
          text: "We design, assemble, and ship custom invitations that reflect your event's style and story.",
        },
        {
          title: 'Gift Sets',
          text: 'We craft personalized gift sets for weddings, holidays, and special occasions, curated with care and ready to impress.',
        },
      ],
      galleryTitle: 'A glimpse into celebrated moments.',
      galleryPhotos: ['wedding-gown-window', 'wedding-gown-back', 'gift-basket'],
      ctaTitle: 'Begin Your Celebration',
      ctaText:
        "Every great event starts with a conversation. Whether you're planning a wedding, a corporate gathering, or a milestone celebration, we'd love to hear your vision.",
      ctaLabel: 'Get In Touch',
      theme: { ink: '#1a1714', paper: '#faf8f4', accent: '#c9a96e', accentSoft: '#f7f0e3' },
    },
  },
];
