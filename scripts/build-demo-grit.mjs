#!/usr/bin/env node
/**
 * Builds a light, non-indexed, base-path demo of the Grit concept site and syncs it into
 * public/demos/grit/ for the /sandbox iframe.
 *
 *   node scripts/build-demo-grit.mjs           (run from the Corvis folder)
 *
 * The source project is only read. Everything happens in a scratch copy:
 *   1. copy the source (minus node_modules/dist/.git/tests/docs/tooling configs) and install the
 *      pinned build deps once;
 *   2. patch the copy (see scripts/demo-grit/source-patches.mjs for the documented list): no
 *      sitemap, AVIF-only images on a short srcset ladder, forms that cannot send anything;
 *   3. `astro build --site <corvis> --base /demos/grit`;
 *   4. post-process the output: prefix hardcoded "/..." URLs, noindex + no canonical on every
 *      page, no social/JSON-LD head tags, external links in a new tab, drop sitemap/robots/source
 *      maps, remove unused image originals, verify images are metadata-free and bounded;
 *   5. scan for forbidden leftovers (names, claims, analytics, endpoints), wipe the target and
 *      copy the result, printing size and file count.
 *
 * Env overrides: DEMO_GRIT_SOURCE, DEMO_GRIT_WORK, PUBLIC_SITE_URL.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  basePath,
  buildDependencies,
  excludedSourceNames,
  expectedPages,
  forbiddenLeftovers,
  imageBuild,
  previewMessage,
  removedFromCopy,
  siteCopyDir,
  siteUrl,
  sourceDir,
  targetDir,
  workDir,
} from './demo-grit/config.mjs';
import { prefixCssUrls, transformPage } from './demo-grit/html.mjs';
import { applySourcePatches } from './demo-grit/source-patches.mjs';
import { assertImagesClean, pruneUnreferencedImages } from './demo-modlabs/images.mjs';
import {
  directoryStats,
  formatMegabytes,
  pathExists,
  walkFiles,
  wipe,
} from './demo-refined/fs-utils.mjs';

const log = (message) => console.log(`\n== ${message}`);
const isWindows = process.platform === 'win32';
const widestImage = imageBuild.breakpoints.at(-1);

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows && command === 'npm',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)),
    );
  });
}

async function readPinnedVersions() {
  const lock = JSON.parse(await fs.readFile(path.join(sourceDir, 'package-lock.json'), 'utf8'));
  return Object.fromEntries(
    buildDependencies.map((name) => {
      const version = lock.packages?.[`node_modules/${name}`]?.version;
      if (!version) throw new Error(`${name} not found in the source lockfile`);
      return [name, version];
    }),
  );
}

async function ensureDependencies() {
  const versions = await readPinnedVersions();
  const manifestPath = path.join(workDir, 'package.json');
  const manifest = JSON.stringify(
    { name: 'grit-demo-deps', private: true, type: 'module', dependencies: versions },
    null,
    2,
  );
  const isUnchanged =
    (await pathExists(manifestPath)) && (await fs.readFile(manifestPath, 'utf8')) === manifest;
  if (isUnchanged && (await pathExists(path.join(workDir, 'node_modules', 'astro')))) {
    console.log('  build dependencies already installed');
    return;
  }
  await fs.mkdir(workDir, { recursive: true });
  await fs.writeFile(manifestPath, manifest);
  await run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: workDir });
}

async function copySource() {
  await wipe(siteCopyDir);
  await fs.cp(sourceDir, siteCopyDir, {
    recursive: true,
    filter: (source) => !excludedSourceNames.has(path.basename(source)),
  });
  for (const relative of removedFromCopy) await wipe(path.join(siteCopyDir, relative));
  // The copy only needs to be a module-type project; deps resolve from <work>/node_modules.
  await fs.writeFile(
    path.join(siteCopyDir, 'package.json'),
    '{ "name": "grit-demo", "type": "module" }\n',
  );
  await wipe(path.join(siteCopyDir, 'package-lock.json'));
  // Unit tests import vitest, which the scratch workspace does not install.
  for (const file of await walkFiles(path.join(siteCopyDir, 'src'))) {
    if (/\.test\.ts$/.test(file)) await fs.rm(file);
  }
}

async function buildSite() {
  const astroBin = path.join(workDir, 'node_modules', 'astro', 'bin', 'astro.mjs');
  await run(process.execPath, [astroBin, 'build', '--site', siteUrl, '--base', basePath], {
    cwd: siteCopyDir,
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  });
}

async function postProcess(dist) {
  const unwanted = ['sitemap-index.xml', 'sitemap-0.xml', 'robots.txt', '_headers', '_redirects'];
  for (const name of unwanted) await wipe(path.join(dist, name));
  let pages = 0;
  for (const file of await walkFiles(dist)) {
    if (file.endsWith('.map')) await fs.rm(file);
    else if (file.endsWith('.html')) {
      await fs.writeFile(file, transformPage(await fs.readFile(file, 'utf8'), basePath));
      pages += 1;
    } else if (file.endsWith('.css')) {
      await fs.writeFile(file, prefixCssUrls(await fs.readFile(file, 'utf8'), basePath));
    }
  }
  console.log(`  transformed ${pages} pages`);
  const pruned = await pruneUnreferencedImages(dist);
  console.log(
    `  removed ${pruned.removed} unreferenced original images (${formatMegabytes(pruned.bytes)})`,
  );
  const images = await assertImagesClean(dist, widestImage);
  console.log(
    `  images: ${images.count} files, ${formatMegabytes(images.bytes)}, no metadata, max ${widestImage}px wide`,
  );
}

/** Fails if forbidden strings survive, an expected page is missing, or a form lost its preview. */
async function assertClean(dist) {
  const textFile = /\.(html|css|js|mjs|json|svg|txt|xml|webmanifest)$/i;
  const problems = [];
  for (const file of await walkFiles(dist)) {
    if (!textFile.test(file)) continue;
    const text = await fs.readFile(file, 'utf8');
    for (const { label, pattern } of forbiddenLeftovers) {
      if (pattern.test(text)) problems.push(`${path.relative(dist, file)} contains "${label}"`);
    }
  }
  for (const page of expectedPages) {
    const file = page === '' ? 'index.html' : `${page}.html`;
    if (!(await pathExists(path.join(dist, file)))) problems.push(`missing page ${file}`);
  }
  for (const page of ['contact.html', 'careers.html']) {
    const html = await fs.readFile(path.join(dist, page), 'utf8');
    if (!html.includes(previewMessage)) problems.push(`${page}: form preview message missing`);
    if (/<form[^>]*\saction=/i.test(html)) problems.push(`${page}: a form still has an action`);
  }
  if (problems.length) throw new Error(`Problems found:\n  ${problems.join('\n  ')}`);
  console.log(
    `  no forbidden leftovers (${forbiddenLeftovers.map((item) => item.label).join(', ')})`,
  );
}

async function syncToTarget(dist) {
  await wipe(targetDir);
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(dist, targetDir, { recursive: true, filter: (source) => !source.endsWith('.map') });
}

async function main() {
  if (!(await pathExists(path.join(sourceDir, 'astro.config.mjs')))) {
    throw new Error(`Grit source not found at ${sourceDir}`);
  }
  log('Installing build dependencies (cached)');
  await ensureDependencies();
  log('Copying source to scratch');
  await copySource();
  log('Patching scratch copy');
  await applySourcePatches(siteCopyDir);
  log(`Building with base ${basePath}`);
  await buildSite();
  const dist = path.join(siteCopyDir, 'dist');
  log('Post-processing output');
  await postProcess(dist);
  log('Checking for forbidden leftovers');
  await assertClean(dist);
  log(`Syncing to ${targetDir}`);
  await syncToTarget(dist);
  const { fileCount, bytes } = await directoryStats(targetDir);
  console.log(`\nDone: ${fileCount} files, ${formatMegabytes(bytes)} in public/demos/grit`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
