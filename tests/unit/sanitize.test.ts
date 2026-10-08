import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The portfolio sample is a rebuild of a real business with every identifying detail removed.
 * This guard fails if any of those details (or the earlier placeholder client names) ever returns
 * to the shipped source or public files.
 */
const FORBIDDEN =
  /zydeco|baton rouge|louisiana|\b225\b|348-5122|highlandia|lyon|\bHFS\b|wafb|wgno|usa today|house ?beautiful|daily advertiser|alder|finch/i;

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.astro',
  '.css',
  '.html',
  '.txt',
  '.svg',
  '.json',
  '.md',
  '.mjs',
  '.js',
  '.map',
  '.xml',
  '.webmanifest',
]);

/** Refined Celebrations & Co. is shown with its real name, copy and photos (owner permission). */
const REAL_PROJECT_PATHS = [
  'public/demos/refined-celebrations/',
  'public/demos/mod-labs/',
  'src/assets/portfolio/refined/',
  'src/assets/portfolio/modlabs/',
];

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const root = process.cwd();
const toPosix = (file: string) => relative(root, file).replaceAll(sep, '/');
const files = ['src', 'public']
  .flatMap((folder) => walk(join(root, folder)))
  .filter((file) => !REAL_PROJECT_PATHS.some((prefix) => toPosix(file).startsWith(prefix)));
const saltwaterDemos = existsSync(join(root, 'public/demos'))
  ? readdirSync(join(root, 'public/demos')).filter((name) => name.startsWith('saltwater-row'))
  : [];

describe('sanitized portfolio', () => {
  it('finds files to scan', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('keeps real-business strings out of every source and public text file', () => {
    const offenders = files
      .filter((file) => TEXT_EXTENSIONS.has(extname(file)))
      .filter((file) => FORBIDDEN.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });

  it('keeps real-business strings out of file names', () => {
    const offenders = files.filter((file) => FORBIDDEN.test(toPosix(file)));
    expect(offenders).toEqual([]);
  });

  // The demo builds are copied in from sibling projects; they may not exist yet in a fresh checkout.
  describe.skipIf(saltwaterDemos.length === 0)('saltwater-row demo builds', () => {
    const demoFiles = saltwaterDemos.flatMap((name) => walk(join(root, 'public/demos', name)));

    it('contains files to scan', () => {
      expect(demoFiles.length).toBeGreaterThan(0);
    });

    it('keeps real-business strings out of every demo text file and file name', () => {
      const offenders = demoFiles
        .filter(
          (file) =>
            FORBIDDEN.test(toPosix(file)) ||
            (TEXT_EXTENSIONS.has(extname(file)) && FORBIDDEN.test(readFileSync(file, 'utf8'))),
        )
        .map(toPosix);
      expect(offenders).toEqual([]);
    });
  });
});
