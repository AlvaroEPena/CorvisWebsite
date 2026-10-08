// One-off asset script: builds the Grit thumbnails in src/assets/portfolio/grit/.
//
// DATA NOTE: Grit is a concept made for a prospective owner (fictional company, placeholder details).
// Its photographs are free-licence Unsplash photos (Unsplash License), credited on the Work card:
//   dusk-bridge          Jeremy Doddridge
//   bridge-construction  Mason Kimbarovsky
//   deck-overlay         Tom Shamberger
//   steel-truss          benjamin lehman
// Picks show no identifiable face. sharp drops EXIF/GPS unless withMetadata() is called, so the output
// carries none. Each file is re-encoded to AVIF at 600 px wide, stepping the quality down until it is
// at most MAX_KB, to keep the home page light.
//
// Usage: node scripts/optimize-grit.mjs <grit>/src/assets/photos
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Pass the Grit photos directory as the first argument.');

const WIDTH = 600;
const MAX_KB = 60;
const QUALITIES = [85, 78, 72, 66, 60, 54, 48, 42, 36, 30];

const picks = [
  { source: 'home-hero.jpg', name: 'dusk-bridge' },
  { source: 'bridge-hero.jpg', name: 'bridge-construction' },
  { source: 'deck-overlay.jpg', name: 'deck-overlay' },
  { source: 'steel-truss.jpg', name: 'steel-truss' },
];

const outDir = new URL('../src/assets/portfolio/grit/', import.meta.url);
await mkdir(outDir, { recursive: true });

for (const { source, name } of picks) {
  const resized = await sharp(join(sourceDir, source))
    .rotate() // apply EXIF orientation before metadata is dropped
    .resize({ width: WIDTH, withoutEnlargement: true })
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
