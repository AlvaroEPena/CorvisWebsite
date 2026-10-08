/**
 * Portfolio entries. Add a project by appending to `projects`: the Work section stacks each entry
 * as a showcase, and the before/after slider uses the first entry's "old" and "new" site recreations.
 *
 * DATA NOTE: the photos in src/assets/portfolio/pool/ are the original client's, used for a concept
 * sample at the owner's decision. Every identifying detail (name, logo, contact data, places, people,
 * press, financing partners, reviews) has been replaced, and the business below is fictional.
 */
export interface ProjectPhoto {
  /** File name (without extension) inside the project's folder in src/assets/portfolio. */
  file: string;
  alt: string;
}

export interface SiteService {
  title: string;
  text: string;
  tags?: readonly string[];
  /** Photo file name from `photos`. */
  photo: string;
}

export interface SiteQuote {
  title: string;
  quote: string;
  name: string;
}

/** Copy for the recreated sites. The old and new sites tell the same business story. */
export interface SiteContent {
  domain: string;
  brand: string;
  descriptor: string;
  phone: string;
  email: string;
  hours: string;
  /** New site hero. */
  headline: string;
  subline: string;
  cta: string;
  secondaryCta: string;
  nav: readonly string[];
  stats: readonly { value: string; label: string }[];
  aboutTitle: string;
  aboutText: string;
  servicesTitle: string;
  services: readonly SiteService[];
  stepsTitle: string;
  steps: readonly { title: string; text: string }[];
  galleryTitle: string;
  quotesTitle: string;
  quotes: readonly SiteQuote[];
  paymentTitle: string;
  paymentText: string;
  ctaTitle: string;
  ctaText: string;
  /** Old site copy. */
  old: {
    nav: readonly string[];
    headline: readonly string[];
    whatWeDoTitle: string;
    whatWeDoLead: string;
    whatWeDoText: string;
    estimateCta: string;
    reviewsTitle: string;
    moreReviews: string;
    bandLines: readonly string[];
    footerLine: string;
  };
}

export interface Project {
  id: string;
  /** Fictional business name; never a real client. */
  name: string;
  /** Always shown on the card until real case studies replace the concept work. */
  label: 'Sample project / concept work';
  category: string;
  /** Folder name inside src/assets/portfolio. */
  folder: string;
  /** What we built and why it works, in plain language. */
  summary: string;
  built: readonly string[];
  whyItWorks: readonly string[];
  site: SiteContent;
  /** Photos used by the recreated sites. The first is the hero-adjacent "about" image. */
  photos: readonly ProjectPhoto[];
  placeholder: true;
}

export const projects: readonly Project[] = [
  {
    id: 'saltwater-row',
    name: 'Saltwater Row Outdoor Living',
    label: 'Sample project / concept work',
    category: 'Website rebuild',
    folder: 'pool',
    summary:
      'A real rebuild, with the details changed: a dated brochure site for a custom pool builder became a fast, photo-led site with one clear action and a quote request that works with one thumb.',
    built: [
      'A full-bleed water hero that says what they do in one sentence',
      'A services section that explains each specialty with a real photo',
      'A five-step build process that answers "what happens next"',
      'A project gallery and a short quote request on every screen',
    ],
    whyItWorks: [
      'Visitors see finished backyards in the first second, so trust comes before any copy.',
      'Every section ends in the same action, a quote request.',
      'Optimized images and lean code keep the page quick on mobile data.',
    ],
    site: {
      domain: 'saltwaterrow.example',
      brand: 'Saltwater Row',
      descriptor: 'Outdoor Living',
      phone: '(555) 010-0142',
      email: 'hello@saltwaterrow.example',
      hours: 'Monday - Friday, 9:00 am - 5:00 pm',
      headline: 'Meet the backyard you have been dreaming of.',
      subline:
        'Custom concrete pools and waterfront construction, built from first sketch to first swim by one crew.',
      cta: 'Get a free quote',
      secondaryCta: 'See our work',
      nav: ['Services', 'Gallery', 'About', 'Contact'],
      stats: [
        { value: '12+', label: 'years building backyards' },
        { value: 'Licensed', label: 'concrete pool builder' },
        { value: '5', label: 'specialties under one roof' },
      ],
      aboutTitle: 'A local builder that handles all of it.',
      aboutText:
        'Permits, materials, labor, scheduling and warranties are on us, so the only thing left for you to decide is how the backyard should feel.',
      servicesTitle: 'Everything the backyard needs.',
      services: [
        {
          title: 'Custom pools',
          text: 'Shaped to your yard and your family, from sleek rectangles to freeform lagoons, with spas, sun shelves and water features built in.',
          tags: ['Custom design and layout', 'Spas and sun shelves', 'Waterfalls and jets'],
          photo: 'pool-03',
        },
        {
          title: 'Waterfront construction',
          text: 'Bulkheads, retaining walls, piers and boat houses engineered for the water and the soil.',
          photo: 'pool-09',
        },
        {
          title: 'Fire features',
          text: 'Fire pits and flame bowls that turn the pool deck into an evening destination.',
          photo: 'pool-10',
        },
        {
          title: 'Patios and decks',
          text: 'Covered patios, pavilions and decks that connect the house to the water.',
          photo: 'pool-04',
        },
        {
          title: 'Excavation',
          text: 'Careful site prep and dirt work so every build starts on solid ground.',
          photo: 'pool-12',
        },
      ],
      stepsTitle: 'From dirt to dive-in.',
      steps: [
        {
          title: 'Choose the site',
          text: 'We walk your property and pick the spot that works with sun, slope and trees.',
        },
        {
          title: 'Pull the permits',
          text: 'Permit help is part of the job, so paperwork never slows the build.',
        },
        {
          title: 'Dig and shape',
          text: 'Our crew cuts the shape from your design with the right drainage underneath.',
        },
        {
          title: 'Build the shell',
          text: 'Steel goes in, then a strong, seamless concrete shell made to last.',
        },
        {
          title: 'Install the equipment',
          text: 'Pumps, filters and controls go in, tested and ready for the first fill.',
        },
      ],
      galleryTitle: 'Backyards we have built.',
      quotesTitle: 'What homeowners say',
      quotes: [
        {
          title: 'Top notch',
          quote: 'They handled the permits, the dig and the schedule. We just picked the tile.',
          name: 'Sample feedback',
        },
        {
          title: 'Experience',
          quote: 'Our yard went from bare dirt to the place everyone wants to be on weekends.',
          name: 'Sample feedback',
        },
        {
          title: 'Knowledgeable',
          quote: 'Every question got a straight answer, and the crew was easy to work with.',
          name: 'Sample feedback',
        },
        {
          title: 'Professional',
          quote: 'On time, tidy and clear about cost. We would hire them again.',
          name: 'Sample feedback',
        },
      ],
      paymentTitle: 'Pay for it your way.',
      paymentText:
        'Flexible payment options can get your pool started now. Ask us how it works when you request your quote.',
      ctaTitle: 'Ready to build the backyard you picture?',
      ctaText:
        'Tell us about your yard and we will walk the site, talk through options and give you a clear quote.',
      old: {
        nav: ['Home', 'Services', 'Gallery', 'About', 'Contact'],
        headline: ['MEET THE BACKYARD', 'OF YOUR', 'DREAMS'],
        whatWeDoTitle: 'WHAT WE DO',
        whatWeDoLead:
          'Your dream backyard is a lifetime investment of relaxation, fun, and social well-being.',
        whatWeDoText:
          "When you choose us, you're choosing the partner that will work to meet your expectations like no other - properly conceived, planned, and constructed to the highest standards.",
        estimateCta: 'Get A FREE Estimate',
        reviewsTitle: 'TESTIMONIALS',
        moreReviews: 'READ MORE REVIEWS',
        bandLines: ['WHERE IMAGINATION MEETS REALITY,', 'ON LAND OR IN THE WATER.'],
        footerLine: 'Serving homeowners across the region and surrounding areas.',
      },
    },
    photos: [
      { file: 'pool-01', alt: 'Freeform pool with a raised spa, loungers and a covered patio' },
      { file: 'pool-02', alt: 'Curved pool with two in-water loungers and a raised water feature' },
      { file: 'pool-03', alt: 'Rectangular pool with a tiled spa step and travertine decking' },
      { file: 'pool-04', alt: 'Pool beside a covered patio with a raised spa' },
      { file: 'pool-05', alt: 'Clear blue pool with a sun shelf and loungers' },
      { file: 'pool-06', alt: 'Raised stone spa with a waterfall into a plunge area' },
      { file: 'pool-07', alt: 'Backyard pool and house lit at dusk with string lights' },
      { file: 'pool-08', alt: 'Freeform pool surrounded by trees with a spa and loungers' },
      { file: 'pool-09', alt: 'Covered boat slip with a decked walkway beside the water' },
      { file: 'pool-10', alt: 'Pool with a central fire pit, stepping stones and a water slide' },
      { file: 'pool-11', alt: 'Pool and loungers under a bright orange sunset sky' },
      { file: 'pool-12', alt: 'Clear pool with a wide shallow shelf and a brick feature wall' },
    ],
    placeholder: true,
  },
];
