import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { imageLimits } from './config.mjs';
import { walkFiles } from './fs-utils.mjs';

const RASTER = /\.(avif|webp|jpe?g|png)$/i;

function encoderFor(extension, pipeline) {
  const { quality } = imageLimits;
  switch (extension) {
    case 'avif':
      return pipeline.avif({ quality: quality.avif, effort: 4 });
    case 'webp':
      return pipeline.webp({ quality: quality.webp, effort: 5 });
    case 'png':
      return pipeline.png({ compressionLevel: 9 });
    default:
      return pipeline.jpeg({ quality: quality.jpg, mozjpeg: true });
  }
}

/**
 * Cap dimensions and re-encode every raster in place. The build already emits images at a bounded
 * width; the cap is a safety net, and a re-encode is only kept when it is smaller, so quality never
 * drops for nothing. Dimensions are unchanged below the cap, which keeps every srcset valid.
 * sharp drops EXIF/GPS unless asked to keep it, so output is metadata-free.
 */
export async function optimizeImages(dir) {
  const files = (await walkFiles(dir)).filter((file) => RASTER.test(file));
  let before = 0;
  let after = 0;
  for (const file of files) {
    const original = await fs.readFile(file);
    const extension = path.extname(file).slice(1).toLowerCase().replace('jpeg', 'jpg');
    const { width = 0 } = await sharp(original).metadata();
    const resized = sharp(original).rotate();
    const pipeline =
      width > imageLimits.maxWidth
        ? resized.resize({ width: imageLimits.maxWidth, withoutEnlargement: true })
        : resized;
    const encoded = await encoderFor(extension, pipeline).toBuffer();
    const keep = width > imageLimits.maxWidth || encoded.length < original.length * 0.9;
    before += original.length;
    after += keep ? encoded.length : original.length;
    if (keep) await fs.writeFile(file, encoded);
  }
  return { count: files.length, before, after };
}

/** Throws when any raster still carries EXIF/GPS metadata. */
export async function assertNoMetadata(dir) {
  const files = (await walkFiles(dir)).filter((file) => RASTER.test(file));
  for (const file of files) {
    const { exif } = await sharp(file).metadata();
    if (exif) throw new Error(`Image still has EXIF metadata: ${file}`);
  }
}
