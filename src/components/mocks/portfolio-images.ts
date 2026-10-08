import type { ImageMetadata } from 'astro';

/**
 * Every portfolio image, keyed `<folder>/<file>` (for example "pool/pool-01"). Resolved once at
 * build time so the recreated sites and the case-study cards share the same optimized assets.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../../assets/portfolio/**/*.{avif,webp}',
  { eager: true },
);

export const portfolioImages: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [
    path.replace('../../assets/portfolio/', '').replace(/\.(avif|webp)$/, ''),
    module.default,
  ]),
);

export function portfolioImage(folder: string, file: string): ImageMetadata {
  const image = portfolioImages[`${folder}/${file}`];
  if (!image) throw new Error(`Missing portfolio image ${folder}/${file}`);
  return image;
}
