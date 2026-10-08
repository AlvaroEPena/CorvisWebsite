#!/usr/bin/env node
/**
 * Makes the team photos used on /team and the home page: a portrait card (4:5) and a small square
 * avatar per founder, as AVIF, with every bit of metadata stripped. The originals are never copied
 * into the repo; only these small outputs in src/assets/team/ are.
 *
 *   node scripts/make-team-photos.mjs                       Alvaro, from TEAM_PHOTO_ALVARO or the default path
 *   node scripts/make-team-photos.mjs aaron path/to/photo   any founder: <id> <path to the photo>
 *
 * Output: src/assets/team/<id>-card.avif and src/assets/team/<id>-avatar.avif.
 * The id must match a founder id in src/content/site.ts (alvaro, aaron). Alvaro has a hand-picked crop;
 * for any other photo the crop follows the most detailed (attention) part of the picture, so check the
 * result in the browser and, if needed, add a crop below.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const DEFAULT_ALVARO_PHOTO = 'C:/Users/Alvaro/Desktop/Alvaro-5.tif';
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'team');

/**
 * Hand-picked crops as fractions of the source (so they survive a re-export at another size).
 * Alvaro's frame is a 1000x667 landscape with the face right of centre: the card keeps generous
 * headroom with the eyes about a third down, the avatar is a tighter square around the face.
 */
const CROPS = {
  alvaro: {
    card: { left: 0.29, top: 0, width: 0.534, height: 1 },
    avatar: { left: 0.33, top: 0.1, width: 0.46, height: 0.69 },
  },
};

const CARD = { width: 800, height: 1000 }; // 4:5, shown at up to about 420 CSS pixels
const AVATAR = { width: 192, height: 192 }; // shown at 40 to 96 CSS pixels, so 2x covers it
const AVIF = { quality: 58, effort: 7 };

/** Light, even tonal polish so a dusk or indoor photo sits well on the pale site. Not retouching. */
const polish = (image) =>
  image.linear(1.03, 3).gamma(1.1).modulate({ brightness: 1.05, saturation: 1.03 });

function usage(message) {
  console.error(`${message}\nUsage: node scripts/make-team-photos.mjs [<id> <path to photo>]`);
  process.exit(1);
}

const [idArg, pathArg] = process.argv.slice(2);
const id = idArg ?? 'alvaro';
const source =
  pathArg ??
  (id === 'alvaro' ? (process.env.TEAM_PHOTO_ALVARO ?? DEFAULT_ALVARO_PHOTO) : undefined);
if (!/^[a-z]+$/.test(id)) usage(`"${id}" is not a founder id.`);
if (!source) usage(`Give the path to ${id}'s photo.`);

/** Opens the photo upright, in sRGB, 8 bit; returns the pixel size after rotation. */
async function open(path) {
  const { data, info } = await sharp(path)
    .rotate()
    .toColourspace('srgb')
    .raw({ depth: 'uchar' })
    .toBuffer({ resolveWithObject: true });
  return { info, image: () => sharp(data, { raw: info }) };
}

function crop(image, info, box) {
  const left = Math.round(box.left * info.width);
  const top = Math.round(box.top * info.height);
  return image.extract({
    left,
    top,
    width: Math.min(Math.round(box.width * info.width), info.width - left),
    height: Math.min(Math.round(box.height * info.height), info.height - top),
  });
}

async function write(image, size, name) {
  const file = join(outDir, `${id}-${name}.avif`);
  // sharp strips metadata unless withMetadata() is called; nothing is carried over.
  // Never enlarge: a small source stays at its own size rather than being blurred up.
  const info = await polish(image)
    .resize({ ...size, fit: 'cover', position: sharp.strategy.attention, withoutEnlargement: true })
    .sharpen({ sigma: 0.5 })
    .avif(AVIF)
    .toFile(file);
  console.log(`${file}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
}

await mkdir(outDir, { recursive: true });
const { info, image } = await open(source);
const crops = CROPS[id];
await write(crops ? crop(image(), info, crops.card) : image(), CARD, 'card');
await write(crops ? crop(image(), info, crops.avatar) : image(), AVATAR, 'avatar');
