import type { ImageMetadata } from 'astro';

/** Team photos dropped into src/assets/team (AVIF or WebP). The folder may be empty. */
const modules = import.meta.glob<{ default: ImageMetadata }>('../assets/team/*.{avif,webp}', {
  eager: true,
});

const photos: Record<string, ImageMetadata> = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [path.split('/').pop() ?? path, module.default]),
);

/** The photo for a file name, or undefined (the page then shows the initials monogram). */
export function teamPhoto(file: string): ImageMetadata | undefined {
  return photos[file];
}
