/**
 * Sandbox ("test drive") registry. Orchestrator-owned contract: the /sandbox page, the Work section and the
 * demo builds all read from here. Add a project by adding an entry plus its built site under public/demos/<id>/.
 *
 * - A project WITH a `before` is a redesign: the sandbox shows a Before/After toggle.
 * - A project WITHOUT a `before` is a fresh design: the sandbox shows just that one site, no toggle.
 */
export interface SandboxVersion {
  /** Same-origin path of the built static site, with trailing slash, e.g. /demos/refined-celebrations/ */
  src: string;
  /** Accessible iframe title. */
  title: string;
}

export interface SandboxProject {
  /** URL-safe id, also the demo folder name and the deep-link hash (#<id>/<before|after>). */
  id: string;
  name: string;
  category: string;
  summary: string;
  /** Text shown in the sandbox browser frame's address bar (decorative; not a real link). */
  displayUrl: string;
  /** True when identifying details were replaced with fictional ones. */
  sample: boolean;
  versions: { before?: SandboxVersion; after: SandboxVersion };
}

export const sandboxProjects: readonly SandboxProject[] = [
  {
    id: 'saltwater-row',
    name: 'Saltwater Row Outdoor Living',
    category: 'Website redesign',
    summary:
      'A custom pool builder moved from a dated brochure site to a modern, fast site with a live interactive water hero.',
    displayUrl: 'saltwaterrow.example',
    sample: true,
    versions: {
      before: { src: '/demos/saltwater-row-before/', title: 'Saltwater Row: the old website' },
      after: { src: '/demos/saltwater-row/', title: 'Saltwater Row: the new website' },
    },
  },
  {
    id: 'refined-celebrations',
    name: 'Refined Celebrations & Co.',
    category: 'New website design',
    summary:
      'A wedding and event planning and photography portfolio, designed and built from scratch.',
    displayUrl: 'refinedcelebrations.co',
    sample: false,
    versions: {
      after: {
        src: '/demos/refined-celebrations/',
        title: 'Refined Celebrations & Co.: the website',
      },
    },
  },
  {
    id: 'mod-labs',
    name: 'Mod Labs',
    category: 'New website design',
    summary:
      'Console modding and electronics repair in Seattle: clear prices, a deep photo gallery and quote and booking forms, rebuilt from the ground up.',
    displayUrl: 'modlabs.store',
    sample: false,
    versions: {
      after: { src: '/demos/mod-labs/', title: 'Mod Labs: the website' },
    },
  },
  {
    id: 'grit',
    name: 'Grit',
    category: 'New website design (concept)',
    summary:
      'A concept site for a bridge deck repair and protection contractor: bold industrial design, clear services and a filterable project gallery.',
    displayUrl: 'grit.example',
    sample: true,
    versions: {
      after: { src: '/demos/grit/', title: 'Grit: the concept website' },
    },
  },
];

export const getSandboxProject = (id: string): SandboxProject | undefined =>
  sandboxProjects.find((project) => project.id === id);
