import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
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
]);

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const root = process.cwd();
const files = ['src', 'public'].flatMap((folder) => walk(join(root, folder)));

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
    const offenders = files.filter((file) => FORBIDDEN.test(relative(root, file)));
    expect(offenders).toEqual([]);
  });
});
