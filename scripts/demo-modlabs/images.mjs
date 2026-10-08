import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { walkFiles } from '../demo-refined/fs-utils.mjs';

const RASTER = /\.(avif|webp|jpe?g|png)$/i;
const TEXT = /\.(html|css|js|mjs|json|svg)$/i;

/**
 * Astro emits every imported gallery photo as an original-size file in _astro even when only its
 * resized variants are used. Delete the rasters that no page, stylesheet or script mentions.
 * @returns {Promise<{ removed: number, bytes: number }>}
 */
export async function pruneUnreferencedImages(dir) {
  const files = await walkFiles(dir);
  const texts = await Promise.all(
    files.filter((file) => TEXT.test(file)).map((file) => fs.readFile(file, 'utf8')),
  );
  const haystack = texts.join('\n');
  let removed = 0;
  let bytes = 0;
  for (const file of files.filter((candidate) => RASTER.test(candidate))) {
    if (haystack.includes(path.basename(file))) continue;
    bytes += (await fs.stat(file)).size;
    await fs.rm(file);
    removed += 1;
  }
  return { removed, bytes };
}

/** Throws when a raster carries EXIF/XMP/IPTC metadata (GPS included) or exceeds `maxWidth`. */
export async function assertImagesClean(dir, maxWidth) {
  const files = (await walkFiles(dir)).filter((file) => RASTER.test(file));
  const problems = [];
  let bytes = 0;
  for (const file of files) {
    bytes += (await fs.stat(file)).size;
    const { exif, xmp, iptc, width = 0 } = await sharp(file).metadata();
    const name = path.relative(dir, file);
    if (exif || xmp || iptc) problems.push(`${name} carries EXIF/XMP/IPTC metadata`);
    if (width > maxWidth) problems.push(`${name} is ${width}px wide (max ${maxWidth})`);
  }
  if (problems.length) throw new Error(`Image problems:\n  ${problems.join('\n  ')}`);
  return { count: files.length, bytes };
}
