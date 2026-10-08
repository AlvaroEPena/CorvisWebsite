// One-off asset script: builds the sanitized concept-project photos in src/assets/portfolio/pool/.
//
// DATA NOTE: these photographs belong to the original pool-builder client of the original sample-site client.
// They are used here for a concept sample at the owner's decision, with all business details removed.
// sharp drops EXIF/GPS metadata unless withMetadata() is called, so output files carry none.
//
// Usage: node scripts/optimize-portfolio.mjs <source photos dir>
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import sharp from 'sharp';

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Pass the source photos directory as the first argument.');

// Hand-picked (people, logos, text and watermarks excluded). Order = pool-01..pool-08.
const picks = [
  '012491-img_6545.jpg',
  '216e23-img_1018-2-.jpg',
  '83cc39-46f60787-22be-436f-8f27-b0f3de1031d3-1-.jpg',
  '0583c5-68539668071__9e8d6c1f-2ca5-4d60-b51c-8658e689b10b.jpg',
  'a8564c-img_7642.jpg',
  '06c090-img_2558-copy.jpg',
  'bbefff-img_2588-copy-2.jpg',
  'd90a33-img_6547.jpg',
];

const outDir = new URL('../src/assets/portfolio/pool/', import.meta.url);
await mkdir(outDir, { recursive: true });

for (const [index, file] of picks.entries()) {
  const name = `pool-${String(index + 1).padStart(2, '0')}.avif`;
  const info = await sharp(join(sourceDir, file))
    .rotate() // apply EXIF orientation before metadata is dropped
    .resize({ width: 1600, withoutEnlargement: true })
    .avif({ quality: 52, effort: 6 })
    .toFile(fileURLToPath(new URL(name, outDir)));
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + ' KB');
}
