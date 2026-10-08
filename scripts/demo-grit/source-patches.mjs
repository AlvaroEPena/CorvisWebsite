/**
 * Source transforms applied to the SCRATCH copy of Grit (never the original).
 * Each patch must match, otherwise the build fails loudly: it means the source changed and the
 * patch needs a review. Keep patches minimal; everything else is handled on the built output.
 *
 *  1. astro.config.mjs               no sitemap; AVIF image service; fewer srcset widths
 *  2. (new) src/demo-image-service.mjs  sharp service whose default output is AVIF q50
 *  3. lib/url.ts                      route normalisation strips the base path (active nav item)
 *  4. lib/env.ts                      the form endpoint can never be set (no network request)
 *  5. forms/FormShell.astro           method="dialog"; confirmation says "Preview only"
 *  6. gallery/ProjectGallery.astro    lightbox image: 1600px AVIF q50 (was WebP q72)
 *  7. sections/content.ts             no personal name in the page copy ("the owner" instead)
 *  8. text sweeps over src/**         "owner preview" wording becomes "concept preview"
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { basePath, imageBuild, previewMessage, previewNote, previewTitle } from './config.mjs';
import { walkFiles } from '../demo-refined/fs-utils.mjs';
import { replaceBetween, replaceOnce } from './patch-utils.mjs';

/** `/demos/grit` as a regex literal that matches the base only at a path-segment boundary. */
export const baseAsRegex = `/^${basePath.replace(/\//g, '\\/')}(?=\\/|$)/`;

export const imageServiceFile = 'src/demo-image-service.mjs';

/**
 * Wraps Astro's sharp service. Every photo defaults to AVIF at the demo quality, and no output is
 * wider than the largest breakpoint (constrained layouts add a 2x candidate, and plain images
 * would otherwise be emitted at their original size).
 */
export const imageServiceSource = `import sharpService from 'astro/assets/services/sharp';

const MAX_WIDTH = ${imageBuild.breakpoints.at(-1)};

export default {
  ...sharpService,
  async validateOptions(options, imageConfig) {
    options.format ??= 'avif';
    options.quality ??= ${imageBuild.quality};
    if (options.widths) {
      const capped = options.widths.filter((width) => width <= MAX_WIDTH);
      options.widths = capped.length ? capped : [MAX_WIDTH];
    }
    if (options.width > MAX_WIDTH) {
      if (options.height) options.height = Math.round((options.height * MAX_WIDTH) / options.width);
      options.width = MAX_WIDTH;
    }
    return sharpService.validateOptions(options, imageConfig);
  },
};
`;

/** @type {{ file: string, description: string, apply: (text: string) => string }[]} */
export const sourcePatches = [
  {
    file: 'astro.config.mjs',
    description: 'No sitemap; AVIF image service; responsive widths capped at the demo ladder.',
    apply: (text) => {
      let out = replaceOnce(
        text,
        "import sitemap from '@astrojs/sitemap';\n",
        '',
        'sitemap import',
      );
      out = replaceOnce(out, '  integrations: [sitemap()],\n', '', 'sitemap integration');
      return replaceOnce(
        out,
        "  image: { layout: 'constrained' },",
        `  image: {
    layout: 'constrained',
    breakpoints: ${JSON.stringify(imageBuild.breakpoints)},
    service: { entrypoint: './${imageServiceFile}' },
  },`,
        'image config',
      );
    },
  },
  {
    file: 'src/lib/url.ts',
    description: 'Strip the base path so the active nav item and route logic still match.',
    apply: (text) =>
      replaceOnce(
        text,
        String.raw`const withoutExt = pathname.replace(/\.html$/, '')`,
        `const withoutExt = pathname
    .replace(${baseAsRegex}, '')
    .replace(${String.raw`/\.html$/`}, '')`,
        'routePath normalisation',
      ),
  },
  {
    file: 'src/lib/env.ts',
    description: 'Hard-wire demo mode: no form endpoint, so forms can never issue a request.',
    apply: (text) =>
      replaceOnce(
        text,
        "formEndpoint: (import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined) || '',",
        "formEndpoint: '',",
        'form endpoint',
      ),
  },
  {
    file: 'src/components/forms/FormShell.astro',
    description: 'Forms never post natively; the confirmation panel states that nothing was sent.',
    apply: (text) => {
      let out = replaceOnce(text, 'method="post"', 'method="dialog"', 'form method');
      out = replaceOnce(out, '{successTitle}', previewTitle, 'success title');
      out = replaceOnce(out, '{successBody}', previewMessage, 'success body');
      return replaceBetween(
        out,
        'Preview site: demo mode, nothing was sent.',
        '\n    </p>',
        previewNote,
        'demo note',
      );
    },
  },
  {
    file: 'src/components/gallery/ProjectGallery.astro',
    description: `Lightbox image: ${imageBuild.lightboxEdge}px AVIF q${imageBuild.quality} (was WebP q72).`,
    apply: (text) =>
      replaceOnce(
        text,
        "width: 1600, format: 'webp', quality: 72",
        `width: ${imageBuild.lightboxEdge}, format: 'avif', quality: ${imageBuild.quality}`,
        'lightbox image options',
      ),
  },
  {
    file: 'src/components/sections/content.ts',
    description: 'Page copy names the owner generically instead of by personal name.',
    apply: (text) => {
      const out = replaceOnce(
        text,
        'Grit was founded by Chad Diamond to do one thing well:',
        'Grit was founded to do one thing well:',
        'about story',
      );
      return replaceOnce(
        out,
        'Chad Diamond leads Grit and stays close',
        'The owner leads Grit and stays close',
        'leadership bio',
      );
    },
  },
];

/**
 * Wording sweeps over every text file in src/. The source is a preview for a prospective owner;
 * the public demo calls itself a concept instead. Each sweep must match somewhere.
 * @type {{ search: string, replacement: string }[]}
 */
export const textSweeps = [
  { search: 'Preview site for owner review.', replacement: 'Concept preview.' },
  { search: 'the owner preview', replacement: 'this concept preview' },
];

/** Applies every sweep to one text; returns the new text and how many sweeps matched. */
export function sweepText(text, sweeps = textSweeps) {
  let matched = 0;
  const out = sweeps.reduce((current, { search, replacement }) => {
    if (!current.includes(search)) return current;
    matched += 1;
    return current.split(search).join(replacement);
  }, text);
  return { text: out, matched };
}

async function applyTextSweeps(siteDir) {
  const seen = new Set();
  for (const file of await walkFiles(path.join(siteDir, 'src'))) {
    if (!/.(astro|ts|md|mjs)$/.test(file)) continue;
    const before = await fs.readFile(file, 'utf8');
    const { text } = sweepText(before);
    if (text === before) continue;
    for (const { search } of textSweeps) if (before.includes(search)) seen.add(search);
    await fs.writeFile(file, text);
  }
  const missing = textSweeps.filter(({ search }) => !seen.has(search));
  if (missing.length) {
    throw new Error(`Text sweep matched nothing: ${missing.map((m) => m.search).join('; ')}`);
  }
  console.log(`  swept wording in src/: ${[...seen].join('; ')}`);
}

/** Applies the text patches and adds the image service file. */
export async function applySourcePatches(siteDir) {
  for (const patch of sourcePatches) {
    const file = path.join(siteDir, patch.file);
    // Git on Windows can check files out with CRLF; patches are written against LF.
    const before = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    const after = patch.apply(before);
    if (after === before) throw new Error(`Patch changed nothing: ${patch.file}`);
    await fs.writeFile(file, after);
    console.log(`  patched ${patch.file}: ${patch.description}`);
  }
  await applyTextSweeps(siteDir);
  await fs.writeFile(path.join(siteDir, imageServiceFile), imageServiceSource);
  console.log(`  added ${imageServiceFile}: AVIF by default at q${imageBuild.quality}`);
}
