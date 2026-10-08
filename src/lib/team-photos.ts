import type { ImageMetadata } from 'astro';

/**
 * Team photos live in src/assets/team and are found by founder id, so adding a real photo needs no
 * code change beyond its alt text in src/content/team.ts:
 *
 *   <id>-card.avif      portrait for the /team card (4:5)
 *   <id>-avatar.avif    small square for the overlapping avatar stack
 *   <id>-placeholder.svg  shown until the two files above exist; decorative
 *
 * `scripts/make-team-photos.mjs` makes the first two from an original photo (usage in its header).
 */
export interface TeamImages {
  card: ImageMetadata;
  avatar: ImageMetadata;
  /** True for the designed stand-in: it carries no information, so it is decorative (empty alt). */
  isPlaceholder: boolean;
}

type ImageFiles = Readonly<Record<string, ImageMetadata>>;

const PHOTO_EXTENSIONS = ['avif', 'webp', 'jpg'] as const;

const fileNameOf = (path: string): string => path.split('/').pop() ?? path;

function find(files: ImageFiles, base: string): ImageMetadata | undefined {
  for (const extension of PHOTO_EXTENSIONS) {
    const found = files[`${base}.${extension}`];
    if (found) return found;
  }
  return undefined;
}

/** The images for a founder from a name -> image map: the real photo, else the placeholder, else none. */
export function resolveTeamImages(id: string, files: ImageFiles): TeamImages | undefined {
  const card = find(files, `${id}-card`);
  if (card) return { card, avatar: find(files, `${id}-avatar`) ?? card, isPlaceholder: false };
  const placeholder = files[`${id}-placeholder.svg`];
  return placeholder ? { card: placeholder, avatar: placeholder, isPlaceholder: true } : undefined;
}

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/team/*.{avif,webp,jpg,svg}',
  { eager: true },
);

const files: ImageFiles = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [fileNameOf(path), module.default]),
);

/** Images for a founder, or undefined (callers then show the initials monogram). */
export const teamImages = (id: string): TeamImages | undefined => resolveTeamImages(id, files);
