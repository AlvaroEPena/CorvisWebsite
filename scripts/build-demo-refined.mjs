#!/usr/bin/env node
/**
 * Builds a light, non-indexed, base-path demo of the Refined Celebrations & Co. site (the owner's own
 * project) and syncs it into public/demos/refined-celebrations/ for the /sandbox iframe.
 *
 *   node scripts/build-demo-refined.mjs           (run from the Corvis folder)
 *
 * The original project is only read. Everything happens in a scratch copy:
 *   1. copy the source (minus node_modules/dist/.git/...) and install pinned build deps once;
 *   2. patch the copy (see scripts/demo-refined/source-patches.mjs for the full, documented list):
 *      no sitemap, no Google Ads tag, no admin CMS, HoneyBook embed -> static panel, smaller photos,
 *      route matching aware of the base path;
 *   3. `astro build --site <corvis> --base /demos/refined-celebrations` (assets, scripts, fonts and
 *      the lightbox chunks resolve under the base);
 *   4. post-process the output: prefix hardcoded "/..." URLs, noindex + no canonical on every page,
 *      external links in a new tab, remove sitemap/robots/admin/source maps, re-encode images;
 *   5. scan for forbidden leftovers, wipe the target and copy the result, printing size and count.
 *
 * Env overrides: DEMO_REFINED_SOURCE, DEMO_REFINED_WORK, PUBLIC_SITE_URL.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  basePath,
  buildDependencies,
  excludedSourceNames,
  forbiddenLeftovers,
  inquiryPanelText,
  removedFromCopy,
  siteCopyDir,
  siteUrl,
  sourceDir,
  targetDir,
  workDir,
} from './demo-refined/config.mjs';
import {
  directoryStats,
  formatMegabytes,
  pathExists,
  walkFiles,
  wipe,
} from './demo-refined/fs-utils.mjs';
import { prefixCssUrls, transformPage } from './demo-refined/html.mjs';
import { assertNoMetadata, optimizeImages } from './demo-refined/images.mjs';
import { applySourcePatches } from './demo-refined/source-patches.mjs';

const log = (message) => console.log(`\n== ${message}`);
const isWindows = process.platform === 'win32';

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
    { name: 'refined-demo-deps', private: true, type: 'module', dependencies: versions },
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
    '{ "name": "refined-demo", "type": "module" }\n',
  );
  await wipe(path.join(siteCopyDir, 'package-lock.json'));
  // Test files import removed modules and are not part of the site.
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
  const unwanted = ['admin.html', 'admin', 'sitemap-index.xml', 'sitemap-0.xml', 'robots.txt'];
  for (const name of [...unwanted, '_headers', '_redirects']) await wipe(path.join(dist, name));
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
  const images = await optimizeImages(dist);
  console.log(
    `  images: ${images.count} files, ${formatMegabytes(images.before)} -> ${formatMegabytes(images.after)}`,
  );
  await assertNoMetadata(dist);
}

/** Fails if forbidden strings survive, or the inquiry panel is missing from the inquiry pages. */
async function assertClean(dist) {
  const textFile = /\.(html|css|js|mjs|json|svg|txt|xml|webmanifest)$/i;
  const problems = [];
  for (const file of await walkFiles(dist)) {
    if (!textFile.test(file)) continue;
    const text = (await fs.readFile(file, 'utf8')).toLowerCase();
    for (const needle of forbiddenLeftovers) {
      if (text.includes(needle)) problems.push(`${path.relative(dist, file)} contains "${needle}"`);
    }
  }
  for (const page of ['chat-events.html', 'chat-photography.html']) {
    const html = await fs.readFile(path.join(dist, page), 'utf8');
    if (!html.includes(inquiryPanelText))
      problems.push(`${page} is missing the inquiry panel text`);
  }
  if (problems.length) throw new Error(`Forbidden leftovers:\n  ${problems.join('\n  ')}`);
  console.log(`  no forbidden leftovers (${forbiddenLeftovers.join(', ')})`);
}

async function syncToTarget(dist) {
  await wipe(targetDir);
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(dist, targetDir, { recursive: true, filter: (source) => !source.endsWith('.map') });
}

async function main() {
  if (!(await pathExists(path.join(sourceDir, 'astro.config.mjs')))) {
    throw new Error(`Refined Celebrations source not found at ${sourceDir}`);
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
  console.log(
    `\nDone: ${fileCount} files, ${formatMegabytes(bytes)} in public/demos/refined-celebrations`,
  );
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
