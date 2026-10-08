// One-off asset script: builds the Mod Labs photos in src/assets/portfolio/modlabs/.
//
// DATA NOTE: Mod Labs is the owner's own site and the photos are the owner's own bench and build shots,
// so they may be shown with real names. Picks avoid anyone's face and any private detail. sharp drops
// EXIF/GPS unless withMetadata() is called, so the output carries none. Each file is re-encoded to AVIF
// and the quality steps down until it is at most MAX_KB, which keeps the home page light.
//
// Usage: node scripts/optimize-modlabs.mjs <mod-labs>/src/assets/gallery/photos
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';

const sourceDir = process.argv[2];
if (!sourceDir)
  throw new Error('Pass the Mod Labs gallery photos directory as the first argument.');

const MAX_KB = 250;
const QUALITIES = [62, 56, 50, 44, 38];

/**
 * `crop` is a fraction box of the upright source, for the one landscape hero shot cut from a portrait
 * photo (the others keep their portrait frame).
 */
const picks = [
  {
    source: 'p0341.jpg',
    name: 'gwii-handheld-hero',
    width: 1500,
    crop: { left: 0, top: 0.22, width: 1, height: 0.47 },
  },
  { source: 'p0437.jpg', name: 'gwii-handheld-zelda', width: 900 },
  { source: 'p0402.jpg', name: 'wii-miicro-deluxe', width: 900 },
  { source: 'p0019.jpg', name: 'halo-xbox-360', width: 900 },
  { source: 'p0053.jpg', name: 'switch-oled-kamikaze', width: 900 },
  { source: 'p0013.jpg', name: 'xbox-360-matrix-install', width: 900 },
];

const outDir = new URL('../src/assets/portfolio/modlabs/', import.meta.url);
await mkdir(outDir, { recursive: true });

for (const { source, name, width, crop } of picks) {
  const upright = await sharp(join(sourceDir, source))
    .rotate()
    .toBuffer({ resolveWithObject: true });
  const { width: fullWidth, height: fullHeight } = upright.info;
  let image = sharp(upright.data);
  if (crop) {
    image = image.extract({
      left: Math.round(crop.left * fullWidth),
      top: Math.round(crop.top * fullHeight),
      width: Math.round(crop.width * fullWidth),
      height: Math.round(crop.height * fullHeight),
    });
  }
  const resized = await image.resize({ width, withoutEnlargement: true }).toBuffer();
  let info;
  for (const quality of QUALITIES) {
    info = await sharp(resized)
      .avif({ quality, effort: 6 })
      .toFile(fileURLToPath(new URL(`${name}.avif`, outDir)));
    if (info.size <= MAX_KB * 1024) break;
  }
  console.log(`${name}.avif`, info.width, info.height, `${Math.round(info.size / 1024)} KB`);
}
