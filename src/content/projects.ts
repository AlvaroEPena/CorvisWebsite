/**
 * Portfolio entries for the Work section. Add a project by appending to `projects`: the section
 * stacks each entry as a showcase (a live browser-window preview of the real build, plus the case
 * summary and photo thumbnails). `sandboxId` must match an entry in src/content/sandbox.ts so the same project
 * can be test driven on /sandbox.
 *
 * DATA NOTE: Refined Celebrations & Co. is a site we designed and built from scratch. The owner
 * confirmed we may show it with its real name, copy and photographs (photos live in
 * src/assets/portfolio/refined/, re-encoded by scripts/optimize-refined.mjs). Mod Labs is the
 * owner's own site, so its real name, prices and bench photos may be shown too (photos in
 * src/assets/portfolio/modlabs/, re-encoded by scripts/optimize-modlabs.mjs). Grit is a CONCEPT: a
 * preview made for a prospective owner, with a fictional company, filler contacts and free-licence
 * Unsplash photographs (src/assets/portfolio/grit/, scripts/optimize-grit.mjs). It says so on its card.
 */
export interface WorkPhoto {
  /** File name (without extension) inside the project's folder in src/assets/portfolio. */
  file: string;
  alt: string;
}

/** Whether a project is a real client site or a concept made to show a prospective owner. */
export type ProjectStatus = 'live' | 'concept';

export const statusLabel: Record<ProjectStatus, string> = {
  live: 'Live project',
  concept: 'Concept project',
};

/** Credit for photographs we do not own, shown under the thumbnails. */
export interface PhotoCredit {
  text: string;
  /** Who took them, for the tooltip and screen readers. */
  detail: string;
}

export interface WorkProject {
  id: string;
  /** Id of the matching project in src/content/sandbox.ts. */
  sandboxId: string;
  name: string;
  category: string;
  /** Shown as the pill on the card: a live client site, or a concept. */
  status: ProjectStatus;
  /** Folder name inside src/assets/portfolio. */
  folder: string;
  /** What we built and why it works, in plain language. */
  summary: string;
  built: readonly string[];
  whyItWorks: readonly string[];
  /** One line saying whether this replaced an older site. */
  originNote: string;
  /** Four photographs shown as thumbnails under the case summary, in order. */
  photos: readonly WorkPhoto[];
  /** Present when the photographs are licensed from someone else. */
  photoCredit?: PhotoCredit;
}

export const projects: readonly WorkProject[] = [
  {
    id: 'refined-celebrations',
    sandboxId: 'refined-celebrations',
    name: 'Refined Celebrations & Co.',
    category: 'New website design',
    status: 'live',
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
    originNote: 'A brand-new design, built from scratch.',
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
    ],
  },
  {
    id: 'mod-labs',
    sandboxId: 'mod-labs',
    name: 'Mod Labs',
    category: 'New website design',
    status: 'live',
    folder: 'modlabs',
    summary:
      'A console modding and electronics repair shop in Seattle. The site had to make a fiddly, technical service feel clear and trustworthy: what each job costs, what is included, and how to get one booked.',
    built: [
      'A home page that leads with clear prices for the most common mods',
      'Quote and booking forms for local drop-off and mail-in jobs',
      'A builds page for one-off commissions, the GWii portable Wii and the Wii Miicro Deluxe',
      'A photo gallery of real jobs, sorted by console',
    ],
    whyItWorks: [
      'Real prices up front, from 100, so nobody has to ask before they know if it fits.',
      'Bench photos of real jobs build trust faster than any promise.',
      'Short forms and quick turnaround make the next step easy, even on a phone.',
    ],
    originNote: 'A brand-new design, built from scratch.',
    photos: [
      {
        file: 'gwii-handheld-zelda',
        alt: 'A purple portable handheld Wii with GameCube-style buttons, showing a Zelda game on its screen',
      },
      {
        file: 'wii-miicro-deluxe',
        alt: 'A compact silver-and-pink Wii Miicro build with four GameCube controller ports, on a blue repair mat',
      },
      {
        file: 'halo-xbox-360',
        alt: 'A clear-shell Xbox 360 glowing with custom purple and blue RGB lighting',
      },
      {
        file: 'switch-oled-kamikaze',
        alt: 'A red clear-shell Nintendo Switch OLED standing on its dock after a modchip install',
      },
    ],
  },
  {
    id: 'grit',
    sandboxId: 'grit',
    name: 'Grit',
    category: 'New website design (concept)',
    status: 'concept',
    folder: 'grit',
    summary:
      'A concept site for a bridge deck repair and protection contractor: "Bridge decks built to outlast the traffic." It shows how a heavy-civil company can look as solid online as its work does, from deck overlays and waterproofing to carbon fiber strengthening and expansion joints.',
    built: [
      'A cinematic dusk-bridge home page with scroll reveals and the line "Bridge decks. Built to last."',
      'Service pages for deck overlays, waterproofing, concrete repair, strengthening, joints and coatings, reached from a services menu on desktop and a full-screen menu on mobile',
      'A four-stage process timeline and a filterable project gallery with a lightbox and photo credits',
      'Quote and job inquiry forms',
    ],
    whyItWorks: [
      'Charcoal, steel and a safety-orange accent read as authority and trust to public-sector and contractor buyers.',
      'Every service is scannable, and finished projects are shown as proof.',
      'Lean pages and sized images keep it fast on a phone, where site visits often happen.',
    ],
    originNote: 'A concept design, built from scratch. Company details are placeholders.',
    photos: [
      {
        file: 'dusk-bridge',
        alt: 'An arched highway bridge at dusk with light trails crossing a river beneath an orange sky',
      },
      {
        file: 'bridge-construction',
        alt: 'Cable-stayed bridge deck sections reaching outward during construction under an overcast sky',
      },
      {
        file: 'deck-overlay',
        alt: 'A crew applying a surface treatment to a roadway, with a distributor truck and steam rising',
      },
      {
        file: 'steel-truss',
        alt: 'The blue steel truss underside of a bridge seen from below against a pale sky',
      },
    ],
    photoCredit: {
      text: 'Photos: Unsplash',
      detail:
        'Photographs by Jeremy Doddridge, Mason Kimbarovsky, Tom Shamberger and benjamin lehman, used under the Unsplash License.',
    },
  },
];
