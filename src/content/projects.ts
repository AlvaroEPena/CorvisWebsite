/**
 * Portfolio entries. Add a project by appending to `projects`: the Work section shows one entry as a
 * featured showcase and lays several out as a showcase plus a grid.
 *
 * DATA NOTE: the photos in src/assets/portfolio/pool/ are the original client's, used for a concept
 * sample at the owner's decision. Every identifying detail (name, contact data, places, people, logos,
 * reviews) has been removed, and the business below is fictional.
 */
export interface ProjectPhoto {
  /** File name (without extension) inside the project's folder in src/assets/portfolio. */
  file: string;
  alt: string;
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
  /** Text shown inside the browser-window mock of the sanitized site. */
  site: {
    domain: string;
    headline: string;
    subline: string;
    cta: string;
    services: readonly string[];
    galleryTitle: string;
    quoteTitle: string;
  };
  /** First photo is the hero image; the rest fill the gallery. */
  photos: readonly ProjectPhoto[];
  placeholder: true;
}

export const projects: readonly Project[] = [
  {
    id: 'saltwater-row',
    name: 'Saltwater Row Outdoor Living',
    label: 'Sample project / concept work',
    category: 'New website build',
    folder: 'pool',
    summary:
      'A concept remake of a custom pool builder website: photography first, one clear action and a quote request that works with one thumb.',
    built: [
      'A photo-led home page with a full-bleed hero',
      'A services strip that explains the work in plain words',
      'A project gallery that loads fast on a phone',
      'A short quote request instead of a long contact page',
    ],
    whyItWorks: [
      'Visitors see finished backyards in the first second, so trust comes before any copy.',
      'Every section ends in the same action, a quote request.',
      'Optimized images and lean code keep the page quick on mobile data.',
    ],
    site: {
      domain: 'saltwaterrow.example',
      headline: 'Backyards built for long summers.',
      subline: 'Custom pools, spas and outdoor living, designed around how you use your space.',
      cta: 'Request a quote',
      services: ['Custom pools', 'Spas and water features', 'Outdoor living'],
      galleryTitle: 'Recent backyards',
      quoteTitle: 'Plan your backyard',
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
    ],
    placeholder: true,
  },
];
