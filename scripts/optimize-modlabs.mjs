// One-off asset script: builds the Mod Labs photos in src/assets/portfolio/modlabs/.
//
// DATA NOTE: Mod Labs is the owner's own site and the photos are the owner's own bench and build shots,
// so they may be shown with real names. They are the thumbnails under the Work case summary. Picks avoid anyone's face and any private detail. sharp drops
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

const picks = [
  { source: 'p0437.jpg', name: 'gwii-handheld-zelda', width: 600 },
  { source: 'p0402.jpg', name: 'wii-miicro-deluxe', width: 600 },
  { source: 'p0019.jpg', name: 'halo-xbox-360', width: 600 },
  { source: 'p0053.jpg', name: 'switch-oled-kamikaze', width: 600 },
];

const outDir = new URL('../src/assets/portfolio/modlabs/', import.meta.url);
await mkdir(outDir, { recursive: true });

for (const { source, name, width } of picks) {
  const resized = await sharp(join(sourceDir, source))
    .rotate() // apply EXIF orientation before metadata is dropped
    .resize({ width, withoutEnlargement: true })
    .toBuffer();
  let info;
  for (const quality of QUALITIES) {
    info = await sharp(resized)
      .avif({ quality, effort: 6 })
      .toFile(fileURLToPath(new URL(`${name}.avif`, outDir)));
    if (info.size <= MAX_KB * 1024) break;
  }
  console.log(`${name}.avif`, info.width, info.height, `${Math.round(info.size / 1024)} KB`);
}
