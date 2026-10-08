import { formatSandboxHash } from '../lib/sandbox-route';

/** The single "explore" call to action on the home page (under the before/after slider). */
export const sandboxCta = {
  label: 'Explore this redesign site and more',
  href: `/sandbox#${formatSandboxHash('saltwater-row', 'after')}`,
} as const;

/** Copy for the /sandbox page. Project data itself lives in sandbox.ts. */
export const sandboxPage = {
  title: 'Test drive our work | Corvis',
  description:
    'Open real, working Corvis builds in a live browser frame. Click around, switch between the old and new site, and see them at desktop, tablet and phone width.',
  heading: 'Test drive our work.',
  lead: 'Everything below is the real build running live, not a screenshot. Click through it, resize it to a phone, flip between the old and new site. Sample projects have their details changed, and concept projects are previews with placeholder company details.',
  pickerLabel: 'Projects',
  versionLabel: 'Version',
  liveLabel: 'Built from scratch',
  deviceLabel: 'Device width',
  devices: [
    { id: 'desktop', label: 'Desktop', width: '100%' },
    { id: 'tablet', label: 'Tablet', width: '820px' },
    { id: 'phone', label: 'Phone', width: '390px' },
  ],
  unavailableTitle: 'This preview is not available yet',
  unavailableText:
    'The demo for this project is still being prepared. Pick another project, or check back soon.',
  tipsTitle: 'How to test drive',
  tips: [
    {
      title: 'Use it like a visitor',
      text: 'Scroll, open menus and tap buttons inside the frame. It is the actual site.',
    },
    {
      title: 'Compare old and new',
      text: 'Redesigns have a Before and After switch. Each version keeps its own scroll position.',
    },
    {
      title: 'Check every screen',
      text: 'Switch to tablet or phone width, or open the frame full screen.',
    },
  ],
  cta: {
    title: 'Want a site like this for your business?',
    text: 'Tell us about it and we will show you what we would build.',
    label: 'Book a free consult',
    href: '/#contact',
  },
} as const;
