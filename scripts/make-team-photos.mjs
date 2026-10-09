#!/usr/bin/env node
/**
 * Makes the team photos used on /team and the home page: a portrait card (4:5) and a small square
 * avatar per founder, with every bit of metadata stripped. The originals are never copied into the
 * repo; only these outputs in src/assets/team/ are.
 *
 * The outputs are high-quality JPEG MASTERS (quality 95, full colour detail). The site build
 * (astro:assets) turns each into the final AVIF sizes in a single lossy step. Do not save an AVIF
 * here: encoding twice (here, then again in the build) is what made the portraits look soft.
 *
 *   node scripts/make-team-photos.mjs                       Alvaro, from TEAM_PHOTO_ALVARO or the default path
 *   node scripts/make-team-photos.mjs aaron path/to/photo   any founder: <id> <path to the photo>
 *
 * Output: src/assets/team/<id>-card.jpg and src/assets/team/<id>-avatar.jpg.
 * The id must match a founder id in src/content/site.ts (alvaro, aaron). Alvaro has a hand-picked crop;
 * for any other photo the crop follows the most detailed (attention) part of the picture, so check the
 * result in the browser and, if needed, add a crop below.
 */
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const DEFAULT_ALVARO_PHOTO = 'C:/Users/Alvaro/Desktop/Alvaro-Fixed.jpg';
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'team');

/**
 * Hand-picked crops as fractions of the source (so they survive a re-export at another size).
 * Alvaro's frame is a 1000x667 landscape with the face right of centre: the card keeps generous
 * headroom with the eyes about a third down, the avatar is a tighter square around the face.
 */
const CROPS = {
  alvaro: {
    // The supplied Alvaro-Fixed.jpg is already colour-corrected, so no extra tonal polish.
    polish: false,
    card: { left: 0.29, top: 0, width: 0.534, height: 1 },
    avatar: { left: 0.33, top: 0.1, width: 0.46, height: 0.69 },
  },
  // Aaron's supplied headshot is a 2528x1684 landscape, face centred, little headroom: the card takes
  // the full height at 4:5 centred on the face, the avatar is a square around the head.
  aaron: {
    polish: false,
    card: { left: 0.25, top: 0, width: 0.533, height: 1 },
    avatar: { left: 0.31, top: 0.02, width: 0.413, height: 0.62 },
  },
};

const CARD = { width: 1000, height: 1250 }; // 4:5, shown at about 272 CSS pixels (3x covers it, 4x nearly)
const AVATAR = { width: 384, height: 384 }; // shown at about 44 CSS pixels, so 4x covers it
/** A master, not a delivery file: near-lossless, full-resolution colour. */
const MASTER = { quality: 95, chromaSubsampling: '4:4:4', mozjpeg: true };

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

async function write(image, size, name, applyPolish = true) {
  const file = join(outDir, `${id}-${name}.jpg`);
  // An older run saved AVIF files here; they would win over the master, so remove them.
  for (const extension of ['avif', 'webp']) {
    await rm(join(outDir, `${id}-${name}.${extension}`), { force: true });
  }
  // sharp strips metadata unless withMetadata() is called; nothing is carried over. A small source is
  // resampled with Lanczos (clean edges) and lightly sharpened, so the site's single AVIF encode
  // starts from the best picture available.
  const info = await (applyPolish ? polish(image) : image)
    .resize({ ...size, fit: 'cover', position: sharp.strategy.attention, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6, m1: 0.8, m2: 2 })
    .jpeg(MASTER)
    .toFile(file);
  console.log(`${file}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
}

await mkdir(outDir, { recursive: true });
const { info, image } = await open(source);
const crops = CROPS[id];
const applyPolish = crops?.polish !== false;
await write(crops ? crop(image(), info, crops.card) : image(), CARD, 'card', applyPolish);
await write(crops ? crop(image(), info, crops.avatar) : image(), AVATAR, 'avatar', applyPolish);
