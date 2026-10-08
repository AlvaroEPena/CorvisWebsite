/**
 * Source transforms applied to the SCRATCH copy of Mod Labs (never the original).
 * Each patch must match, otherwise the build fails loudly: it means the source changed and the
 * patch needs a review. Keep patches minimal; everything else is handled on the built output.
 *
 *  1. astro.config.mjs        no sitemap integration
 *  2. LabForm.astro           no Turnstile, no /api endpoint (method="dialog": nothing can be posted)
 *  3. lib/forms/schema.ts     drop the Turnstile field name
 *  4. forms/controller.ts     no Turnstile; a valid submit shows the preview message, no request
 *  5. layout/nav.ts           active-nav matching strips the base path
 *  6. media/Photo.astro       AVIF only, q50, responsive widths capped
 *  7. GalleryGrid / Carousel  lightbox images: 1200px longest edge, AVIF q50 (was 1600px WebP q72)
 *  8. data/videos.json        no videos (the gallery shows the project photos only)
 *  9. data/photos.json        first N photos per project + hand-picked key shots; other files deleted
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { basePath, galleryTrim, imageBuild, previewMessage } from './config.mjs';
import { extractPickedIds, selectPhotos, summarizeTrim } from './gallery-trim.mjs';

/** Replace exactly one occurrence; throw if the source no longer contains it. */
function replaceOnce(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Patch target not found: ${label}`);
  return text.replace(search, () => replacement);
}

/** Replace everything from `start` up to (not including) `end` with `insert`. */
function replaceBetween(text, start, end, insert, label) {
  const from = text.indexOf(start);
  const to = from === -1 ? -1 : text.indexOf(end, from);
  if (from === -1 || to === -1) throw new Error(`Patch target not found: ${label}`);
  return text.slice(0, from) + insert + text.slice(to);
}

const baseAsRegex = `/^${basePath.replace(/\//g, '\\/')}/`;

const submitReplacement = `      // Demo: a valid submit never leaves the page. Show what the live site would have done.
      clearErrors();
      setStatus("info", PREVIEW_MESSAGE);
      status.focus();
`;

function patchLightboxImages(text) {
  const withEdge = text.includes('const LIGHTBOX_EDGE = 1600;')
    ? replaceOnce(
        text,
        'const LIGHTBOX_EDGE = 1600;',
        `const LIGHTBOX_EDGE = ${imageBuild.lightboxEdge};`,
        'edge',
      )
    : replaceOnce(text, '1600 / Math.max', `${imageBuild.lightboxEdge} / Math.max`, 'edge');
  return replaceOnce(
    withEdge,
    'format: "webp", quality: 72',
    `format: "avif", quality: ${imageBuild.quality}`,
    'lightbox format/quality',
  );
}

/** @type {{ file: string, description: string, apply: (text: string) => string }[]} */
export const sourcePatches = [
  {
    file: 'astro.config.mjs',
    description: 'Drop the sitemap integration (no sitemap in a demo).',
    apply: (text) => {
      const out = replaceOnce(
        text,
        'import sitemap from "@astrojs/sitemap";\n',
        '',
        'sitemap import',
      );
      return replaceBetween(
        out,
        '  // /contact → /quote is a 301',
        '  fonts: [',
        '',
        'sitemap integration block',
      );
    },
  },
  {
    file: 'src/components/forms/LabForm.astro',
    description: 'No Turnstile widget and no /api endpoint: the form cannot post anywhere.',
    apply: (text) => {
      let out = replaceOnce(
        text,
        'import Turnstile from "./Turnstile.astro";\n',
        '',
        'Turnstile import',
      );
      out = replaceOnce(out, 'const action = `/api/${kind}`;\n', '', 'action constant');
      out = replaceOnce(
        out,
        'method="post"\n    action={action}\n    enctype="multipart/form-data"\n',
        'method="dialog"\n',
        'form method/action',
      );
      return replaceOnce(out, '      <Turnstile action={kind} />\n\n', '', 'Turnstile usage');
    },
  },
  {
    file: 'src/lib/forms/schema.ts',
    description: 'Drop the Turnstile field name from the shared client contract.',
    apply: (text) =>
      replaceOnce(text, '  turnstile: "cf-turnstile-response",\n', '', 'turnstile field name'),
  },
  {
    file: 'src/scripts/forms/controller.ts',
    description:
      'Remove Turnstile; after client-side validation show the preview message instead of fetch().',
    apply: (text) => {
      let out = replaceOnce(
        text,
        'type Kind = "book" | "quote";',
        `const PREVIEW_MESSAGE = ${JSON.stringify(previewMessage)};\n\ntype Kind = "book" | "quote";`,
        'Kind type',
      );
      out = replaceBetween(
        out,
        '  /* ---------- Turnstile ---------- */',
        '  /* ---------- prefill from the URL ---------- */',
        '',
        'Turnstile section',
      );
      out = replaceOnce(
        out,
        '    count();\n    resetTurnstile();\n',
        '    count();\n',
        'reset in resetAll',
      );
      out = replaceOnce(
        out,
        '    resetTurnstile(); // tokens are single-use\n',
        '',
        'reset after failure',
      );
      return replaceBetween(
        out,
        '      if (tsSlot && window.turnstile',
        '    } finally {\n      setBusy(false);',
        submitReplacement,
        'submit: Turnstile check and fetch',
      );
    },
  },
  {
    file: 'src/components/layout/nav.ts',
    description: `Strip the ${basePath} base so the active nav item is still recognised.`,
    apply: (text) =>
      replaceOnce(
        text,
        '.replace(/\\/$/, "") || "/";',
        `.replace(/\\/$/, "").replace(${baseAsRegex}, "") || "/";`,
        'isCurrent normalisation',
      ),
  },
  {
    file: 'src/components/media/Photo.astro',
    description: `Thumbnails: AVIF only (no WebP twin), q${imageBuild.quality}, widths capped at ${imageBuild.maxWidth}px.`,
    apply: (text) => {
      let out = replaceOnce(
        text,
        'widths.filter((w) => w <= photo.width)',
        `widths.filter((w) => w <= photo.width && w <= ${imageBuild.maxWidth})`,
        'usable widths',
      );
      // The <img src> fallback is rendered at width/height, so pass the largest kept variant, not the original.
      out = replaceOnce(
        out,
        'const loadingProps',
        `const outWidth = Math.max(...finalWidths);
const outHeight = Math.round((photo.height * outWidth) / photo.width);
const loadingProps`,
        'output size',
      );
      out = replaceOnce(
        out,
        ['width={photo.width}', 'height={photo.height}'].join('\n    '),
        ['width={outWidth}', 'height={outHeight}'].join('\n    '),
        'output size props',
      );
      out = replaceOnce(out, 'formats={["avif", "webp"]}', 'formats={[]}', 'formats');
      out = replaceOnce(out, 'fallbackFormat="webp"', 'fallbackFormat="avif"', 'fallback format');
      return replaceOnce(
        out,
        'quality={priority ? 70 : 62}',
        `quality={${imageBuild.quality}}`,
        'quality',
      );
    },
  },
  ...['src/components/gallery/GalleryGrid.astro', 'src/components/ui/Carousel.astro'].map(
    (file) => ({
      file,
      description: `Lightbox image: ${imageBuild.lightboxEdge}px longest edge, AVIF q${imageBuild.quality} (was 1600px WebP q72).`,
      apply: patchLightboxImages,
    }),
  ),
  {
    file: 'src/data/videos.json',
    description: "No videos: the gallery shows each project's photos only.",
    apply: () => '[]\n',
  },
];

/** Applies the text patches, then trims the gallery. Returns the per-project trim summary. */
export async function applySourcePatches(siteDir) {
  for (const patch of sourcePatches) {
    const file = path.join(siteDir, patch.file);
    // Git on Windows can check files out with CRLF; patches are written against LF.
    const before = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    const after = patch.apply(before);
    if (after === before && patch.file !== 'src/data/videos.json') {
      throw new Error(`Patch changed nothing: ${patch.file}`);
    }
    await fs.writeFile(file, after);
    console.log(`  patched ${patch.file}: ${patch.description}`);
  }
  return trimGallery(siteDir);
}

async function trimGallery(siteDir) {
  const photosJson = path.join(siteDir, 'src/data/photos.json');
  const records = JSON.parse(await fs.readFile(photosJson, 'utf8'));
  const picks = await fs.readFile(path.join(siteDir, 'src/components/media/picks.ts'), 'utf8');
  const pinnedIds = extractPickedIds(picks);
  const kept = selectPhotos(records, { ...galleryTrim, pinnedIds });
  const keptFiles = new Set(kept.map((record) => record.file));
  await fs.writeFile(photosJson, `${JSON.stringify(kept, null, 2)}\n`);
  for (const record of records) {
    if (!keptFiles.has(record.file))
      await fs.rm(path.join(siteDir, 'src/assets/gallery', record.file));
  }
  console.log(
    `  patched src/data/photos.json: ${records.length} -> ${kept.length} photos ` +
      `(first ${galleryTrim.photosPerProject} per project + hand-picked ids)`,
  );
  return summarizeTrim(records, kept);
}
