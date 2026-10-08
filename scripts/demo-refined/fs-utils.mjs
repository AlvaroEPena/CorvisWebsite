import fs from 'node:fs/promises';
import path from 'node:path';

/** Every file under `dir`, as absolute paths. */
export async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walkFiles(full) : [full];
    }),
  );
  return nested.flat();
}

export async function directoryStats(dir) {
  const files = await walkFiles(dir);
  const sizes = await Promise.all(files.map(async (file) => (await fs.stat(file)).size));
  return { fileCount: files.length, bytes: sizes.reduce((sum, size) => sum + size, 0) };
}

export const formatMegabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/** Delete a directory fully (Windows-safe retries for transient locks). */
export async function wipe(dir) {
  await fs.rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
