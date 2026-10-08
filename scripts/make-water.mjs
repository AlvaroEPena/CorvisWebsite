// One-off asset script: cuts a WATER-ONLY crop out of a reference screenshot of the original
// pool-builder site's hero and joins two of them into one tile at src/assets/portfolio/pool/.
//
// The input screenshot stays outside the repo and is never committed. The crop box was chosen to
// exclude every text, logo and UI element in the screenshot; inspect the result before using it.
//
// Usage: node scripts/make-water.mjs <path to 1440x900 screenshot>
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Pass the screenshot path as the first argument.');

// Two water-only regions, below the navigation: left of the logo mark and right of the headline.
const left = { left: 0, top: 130, width: 500, height: 740 };
const right = { left: 1010, top: 130, width: 430, height: 740 };

const [leftWater, rightWater] = await Promise.all([
  sharp(source).extract(left).toBuffer(),
  sharp(source).extract(right).toBuffer(),
]);

const out = new URL('../src/assets/portfolio/pool/water-01.webp', import.meta.url);
const info = await sharp({
  create: {
    width: left.width + right.width,
    height: left.height,
    channels: 3,
    background: '#0b72c8',
  },
})
  .composite([
    { input: leftWater, left: 0, top: 0 },
    { input: rightWater, left: left.width, top: 0 },
  ])
  .webp({ quality: 66, effort: 6 })
  .toFile(fileURLToPath(out));
console.log('water-01.webp', info.width, info.height, Math.round(info.size / 1024) + ' KB');
