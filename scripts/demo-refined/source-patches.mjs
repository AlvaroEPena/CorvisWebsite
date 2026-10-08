/**
 * Source transforms applied to the SCRATCH copy of Refined Celebrations (never the original).
 * Each patch must match, otherwise the build fails loudly: it means the source changed and the
 * patch needs a review. Keep patches minimal; everything else is handled on the built output.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { basePath, imageBuild, inquiryPanelText } from './config.mjs';

const lightboxSourcePath = 'src/components/portfolio/lightbox-source.ts';

const honeyBookPanel = `---
// Demo-only replacement of the HoneyBook embed (see scripts/build-demo-refined.mjs). Keeps the old
// props so callers are unchanged, but renders a static panel and makes no third-party request.
interface Props {
  placement: 1 | 2;
  title: string;
}
---

<div class="demo-inquiry" role="note">
  <span class="demo-inquiry-mark" aria-hidden="true">&#10022;</span>
  <p class="demo-inquiry-text">${inquiryPanelText}</p>
</div>

<style>
  .demo-inquiry {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    padding: 56px 28px;
    text-align: center;
    background: var(--warm-white);
    border: 1px solid var(--line);
  }
  .demo-inquiry-mark {
    font-size: 1.25rem;
    color: var(--champagne-deep);
  }
  .demo-inquiry-text {
    max-width: 30ch;
    font-family: var(--serif);
    font-size: 1.5rem;
    font-weight: 300;
    font-style: italic;
    line-height: 1.5;
    color: var(--mid);
  }
</style>
`;

/** Replace exactly one occurrence; throw if the source no longer contains it. */
function replaceOnce(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return text.replace(search, () => replacement);
}

/** @type {{ file: string, description: string, apply: (text: string) => string }[]} */
export const sourcePatches = [
  {
    file: 'astro.config.mjs',
    description: 'Drop the sitemap integration (no sitemap in a demo).',
    apply: (text) => {
      let out = replaceOnce(
        text,
        "import sitemap from '@astrojs/sitemap';\n",
        '',
        'sitemap import',
      );
      out = out.replace(
        /\n\s*\/\/ The editor is not a public page\.\n\s*integrations:[^\n]*\n/,
        '\n',
      );
      if (out.includes('sitemap(')) throw new Error('Patch target not found: sitemap integration');
      return out;
    },
  },
  {
    file: 'src/layouts/BaseLayout.astro',
    description: 'Remove the Google Ads / gtag snippet from every page.',
    apply: (text) => {
      let out = replaceOnce(
        text,
        "import GoogleTag from '../components/analytics/GoogleTag.astro';\n",
        '',
        'GoogleTag import',
      );
      out = replaceOnce(out, '    <GoogleTag />\n', '', 'GoogleTag usage');
      return out;
    },
  },
  {
    file: 'src/components/inquiry/HoneyBookEmbed.astro',
    description: 'Replace the HoneyBook embed with a static "form is off in this preview" panel.',
    apply: () => honeyBookPanel,
  },
  {
    file: 'src/components/inquiry/InquirySection.astro',
    description: 'Drop the "fill out the form below" line, which is wrong without a form.',
    apply: (text) =>
      replaceOnce(text, '      <p class="form-sub">{content.formIntro}</p>\n', '', 'form intro'),
  },
  {
    file: 'src/components/pathname.ts',
    description: `Strip the ${basePath} base so route matching (active nav item) still sees clean routes.`,
    apply: (text) =>
      replaceOnce(
        text,
        'const withoutFileSuffix = pathname.replace(',
        `const base = ${JSON.stringify(basePath)};\n  const withoutBase = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;\n  const withoutFileSuffix = withoutBase.replace(`,
        'normalizePathname body',
      ),
  },
  {
    file: lightboxSourcePath,
    description: `Lightbox full-size image: 2400px q90 WebP -> ${imageBuild.lightboxWidth}px q${imageBuild.quality} AVIF (data-pswp sizes follow).`,
    apply: (text) => {
      let out = replaceOnce(
        text,
        'LIGHTBOX_MAX_WIDTH = 2400',
        `LIGHTBOX_MAX_WIDTH = ${imageBuild.lightboxWidth}`,
        'lightbox width',
      );
      out = replaceOnce(out, "format: 'webp',", "format: 'avif',", 'lightbox format');
      out = replaceOnce(out, 'quality: 90,', `quality: ${imageBuild.quality},`, 'lightbox quality');
      return out;
    },
  },
  {
    file: 'src/components/ui/Photo.astro',
    description: `Responsive photos: AVIF only (no WebP twin), q${imageBuild.quality}, widths capped at ${imageBuild.maxWidth}px.`,
    apply: (text) => {
      let out = replaceOnce(
        text,
        'const sourceWidth = intrinsicSize(image).width;',
        `const sourceWidth = intrinsicSize(image).width;
const demoWidths = widths.filter((candidate) => candidate <= ${imageBuild.maxWidth});`,
        'source width',
      );
      out = replaceOnce(out, 'Math.max(...widths)', 'Math.max(...demoWidths)', 'width max');
      out = replaceOnce(out, 'widths={widths}', 'widths={demoWidths}', 'widths prop');
      out = replaceOnce(out, "formats={['avif']}", 'formats={[]}', 'formats');
      out = replaceOnce(out, 'fallbackFormat="webp"', 'fallbackFormat="avif"', 'fallback format');
      return replaceOnce(out, 'quality={85}', `quality={${imageBuild.quality}}`, 'photo quality');
    },
  },
];

export async function applySourcePatches(siteDir) {
  for (const patch of sourcePatches) {
    const file = path.join(siteDir, patch.file);
    const before = await fs.readFile(file, 'utf8');
    const after = patch.apply(before);
    if (after === before && patch.file !== 'src/components/inquiry/HoneyBookEmbed.astro') {
      throw new Error(`Patch changed nothing: ${patch.file}`);
    }
    await fs.writeFile(file, after);
    console.log(`  patched ${patch.file}: ${patch.description}`);
  }
}
