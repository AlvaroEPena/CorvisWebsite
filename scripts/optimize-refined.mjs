// One-off asset script: builds the Refined Celebrations & Co. photos in src/assets/portfolio/refined/.
//
// DATA NOTE: the photographs and copy belong to Refined Celebrations & Co., a site we designed and
// built; the owner confirmed we may show it with real information. Venue, decor and detail shots
// only (no close-up portraits of private clients). sharp drops EXIF/GPS unless withMetadata() is
// called, so the output files carry none.
//
// Usage: node scripts/optimize-refined.mjs <refined-celebrations>/src/assets/site
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import sharp from 'sharp';

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Pass the source site photos directory as the first argument.');

const picks = [
  { file: 'reception-toast.jpg', width: 1500, quality: 66 },
  { file: 'wedding-gown-window.jpg', width: 1100, quality: 66 },
  { file: 'wedding-flatlay.jpg', width: 1100, quality: 66 },
  { file: 'wedding-gown-back.jpg', width: 1100, quality: 66 },
  { file: 'gift-basket.jpg', width: 1000, quality: 66 },
];

const outDir = new URL('../src/assets/portfolio/refined/', import.meta.url);
await mkdir(outDir, { recursive: true });

for (const { file, width, quality } of picks) {
  const name = file.replace(/\.jpg$/, '.avif');
  const info = await sharp(join(sourceDir, file))
    .rotate() // apply EXIF orientation before metadata is dropped
    .resize({ width, withoutEnlargement: true })
    .avif({ quality, effort: 6 })
    .toFile(fileURLToPath(new URL(name, outDir)));
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + ' KB');
}
