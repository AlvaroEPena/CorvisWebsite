#!/usr/bin/env node
/**
 * Crawls the shipped Mod Labs demo like the /sandbox iframe would load it, from a Cloudflare-like
 * static server over Corvis `public/`. Run from the Corvis folder:
 *
 *   node scripts/demo-modlabs/verify.mjs [--shots <dir>] [--live <dist dir>]
 *
 * Asserts: every page and asset answers 200 (all srcset candidates and lightbox hrefs included), no
 * failed requests, no console errors, no third-party hosts, noindex on every page, internal links
 * stay under the base path, external links open in a new tab with rel=noopener, the nav works and
 * marks the current section, the lightbox opens and closes, and both request forms show the preview
 * message while making NO network request. Optional screenshots at 1440 and 390 wide, plus the same
 * pages from the original site's own build (`--live`) for a side-by-side fidelity check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { startStaticServer } from '../demo-refined/static-server.mjs';
import { basePath, corvisRoot, expectedPages, previewMessage, sourceDir } from './config.mjs';

const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index > -1 ? path.resolve(process.argv[index + 1]) : undefined;
};
const shotsDir = argValue('--shots');
const liveDist = argValue('--live') ?? path.join(sourceDir, 'dist');
const failures = [];
const fail = (message) => failures.push(message);

const server = await startStaticServer(path.join(corvisRoot, 'public'));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

/** Visits one page; returns its distinct internal page links. */
async function auditPage(context, url, log) {
  const page = await context.newPage();
  const label = new URL(url).pathname;
  page.on('response', (response) => {
    const requested = new URL(response.url());
    log.requests.add(response.url());
    if (requested.origin !== origin && !requested.protocol.startsWith('data')) {
      fail(`${label}: third-party response ${response.url()}`);
    } else if (response.status() >= 400 && !(label.endsWith('/404') && response.url() === url)) {
      fail(`${label}: HTTP ${response.status()} for ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => fail(`${label}: request failed ${request.url()}`));
  page.on('console', (message) => {
    if (message.type() === 'error') fail(`${label}: console error ${message.text()}`);
  });
  page.on('pageerror', (error) => fail(`${label}: page error ${error.message}`));

  const response = await page.goto(url, { waitUntil: 'load' });
  if (response?.status() !== 200) fail(`${label}: page status ${response?.status()}`);
  await scrollThrough(page);
  await page.waitForLoadState('networkidle');

  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute('content', { timeout: 2000 })
    .catch(() => null);
  if (robots !== 'noindex, nofollow') fail(`${label}: robots meta is "${robots}"`);
  if (await page.locator('link[rel="canonical"]').count()) fail(`${label}: canonical link present`);
  if (await page.locator('script[type="application/ld+json"]').count())
    fail(`${label}: JSON-LD present`);

  const anchors = await page.$$eval('a[href]', (nodes) =>
    nodes.map((node) => ({
      href: node.getAttribute('href') ?? '',
      resolved: node.href,
      target: node.target,
      rel: node.rel,
    })),
  );
  const internal = new Set();
  for (const anchor of anchors) {
    if (/^(mailto:|tel:|#)/.test(anchor.href)) continue;
    const resolved = new URL(anchor.resolved);
    if (resolved.origin === origin) {
      if (!resolved.pathname.startsWith(`${basePath}/`) && resolved.pathname !== basePath) {
        fail(`${label}: link leaves the base path: ${anchor.href}`);
      }
      resolved.hash = '';
      // Lightbox links point at images: verify them as assets, not as pages.
      if (/\.(avif|webp|jpe?g|png|svg)$/i.test(resolved.pathname))
        log.declaredAssets.add(resolved.href);
      else internal.add(resolved.href);
    } else if (anchor.target !== '_blank' || !/noopener/.test(anchor.rel)) {
      fail(`${label}: external link without target/rel: ${anchor.href}`);
    }
  }
  const assetUrls = await page.$$eval('[src],[srcset],link[href],source[srcset]', (nodes) =>
    nodes.flatMap((node) => {
      const raw = [node.getAttribute('src'), node.getAttribute('href')];
      const srcset = node.getAttribute('srcset');
      if (srcset) raw.push(...srcset.split(',').map((part) => part.trim().split(/\s+/)[0]));
      return raw.filter(Boolean).map((value) => new URL(value, document.baseURI).href);
    }),
  );
  for (const asset of assetUrls) log.declaredAssets.add(asset);
  return { page, internal };
}

/** Scroll through the page so lazy images and reveal-on-scroll content actually load. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
}

const log = { requests: new Set(), declaredAssets: new Set() };
const visited = new Set();
const queue = expectedPages.map((page) => `${origin}${basePath}/${page}`);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

while (queue.length) {
  const url = queue.shift();
  const key = url.replace(/\/$/, '');
  if (visited.has(key)) continue;
  console.log(`crawling ${url}`);
  const { page, internal } = await auditPage(context, url, log);
  visited.add(key);
  for (const link of internal) queue.push(link);
  await page.close();
}
for (const page of expectedPages) {
  if (!visited.has(`${origin}${basePath}/${page}`.replace(/\/$/, '')))
    fail(`expected page was not crawled: /${page}`);
}

// Every URL a page declares (including unused srcset candidates) must exist.
for (const asset of log.declaredAssets) {
  if (!asset.startsWith(origin)) {
    if (!asset.startsWith('data:')) fail(`declared third-party URL: ${asset}`);
    continue;
  }
  const response = await fetch(asset);
  if (response.status !== 200) fail(`declared asset HTTP ${response.status}: ${asset}`);
}

/** Fills the shared request form fields; the caller adds the kind-specific ones. */
async function fillCommonFields(page, kind) {
  await page.locator(`#${kind}-name`).fill('Demo Visitor');
  await page.locator(`#${kind}-email`).fill('visitor@example.com');
  await page
    .locator(`#${kind}-message`)
    .fill('Testing the preview form with a long enough message.');
  await page.locator('input[name="consent"]').check();
}

// Forms: invalid submit shows field errors, a valid one shows the preview message, nothing is sent.
for (const kind of ['book', 'quote']) {
  const page = await context.newPage();
  await page.goto(`${origin}${basePath}/${kind}`);
  const form = page.locator(`form[data-lab-form="${kind}"]`);
  const action = await form.getAttribute('action');
  if (action) fail(`${kind}: form still has an action (${action})`);
  if ((await form.getAttribute('method')) !== 'dialog') fail(`${kind}: form method is not dialog`);
  if (await page.locator('[data-turnstile], .ts').count())
    fail(`${kind}: spam-check widget present`);

  await form.locator('[data-submit]').click();
  await page.locator('.field-error:not(:empty)').first().waitFor({ timeout: 8000 });
  if ((await page.locator('.form-status').textContent())?.includes('Nothing was sent'))
    fail(`${kind}: invalid form showed the preview message`);

  await fillCommonFields(page, kind);
  if (kind === 'book') await page.locator('input[name="services"]').first().check();
  else await page.locator('select[name="requestType"]').selectOption({ index: 1 });
  const sent = [];
  page.on('request', (request) => sent.push(`${request.method()} ${request.url()}`));
  await form.locator('[data-submit]').click();
  await page
    .waitForFunction(
      (text) => document.querySelector('.form-status')?.textContent === text,
      previewMessage,
      { timeout: 8000 },
    )
    .catch(() => fail(`${kind}: preview message did not appear`));
  await page.waitForTimeout(500);
  if (sent.length) fail(`${kind}: submit made network requests: ${sent.join(', ')}`);
  if (await page.locator('[data-success]:not([hidden])').count())
    fail(`${kind}: success panel shown`);
  if (shotsDir) {
    fs.mkdirSync(shotsDir, { recursive: true });
    await page.screenshot({ path: path.join(shotsDir, `${kind}-submitted-1440.png`) });
  }
  await page.close();
}

// Nav: clicking a link navigates under the base and marks the section as current.
{
  const page = await context.newPage();
  await page.goto(`${origin}${basePath}/`);
  await page.locator('header nav[aria-label="Main"] a', { hasText: 'Services' }).click();
  await page.waitForURL(`${origin}${basePath}/services`);
  const currentOf = async () =>
    (await page.locator('header nav[aria-label="Main"] a[aria-current="page"]').allTextContents())
      .map((text) => text.trim())
      .join();
  if ((await currentOf()) !== 'Services')
    fail(`nav: current item on /services is "${await currentOf()}"`);
  await page.goto(`${origin}${basePath}/gallery/switch`);
  if ((await currentOf()) !== 'Gallery')
    fail(`nav: current item on /gallery/switch is "${await currentOf()}"`);
  await page.close();
}

// Lightbox: a gallery click opens PhotoSwipe, Escape closes it.
{
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.goto(`${origin}${basePath}/gallery`);
  await page.locator('a[data-pswp-width]').first().click();
  try {
    await page.locator('.pswp--open').waitFor({ timeout: 8000 });
    await page.locator('.pswp__img').first().waitFor({ timeout: 8000 });
    // Escape is ignored while the open animation is still running.
    await page.locator('.pswp--ui-visible').waitFor({ timeout: 8000 });
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    await page.locator('.pswp--open').waitFor({ state: 'detached', timeout: 8000 });
  } catch (error) {
    fail(`lightbox did not open/close: ${error.message}`);
  }
  errors.forEach((message) => fail(`lightbox console error: ${message}`));
  await page.close();
}

async function capture(root, prefix, routes) {
  const rootServer = root ? await startStaticServer(root) : undefined;
  const rootOrigin = rootServer ? `http://127.0.0.1:${rootServer.address().port}` : origin;
  const prefixPath = rootServer ? '' : basePath;
  for (const [name, route] of routes) {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      const shotContext = await browser.newContext({ viewport: { width, height } });
      const page = await shotContext.newPage();
      await page.goto(`${rootOrigin}${prefixPath}${route}`);
      await scrollThrough(page);
      // The original build may wait on third-party scripts (spam check); do not hang on it.
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
      await page.screenshot({
        path: path.join(shotsDir, `${prefix}-${name}-${width}.png`),
        fullPage: name !== 'gallery',
      });
      await shotContext.close();
    }
  }
  rootServer?.close();
}

if (shotsDir) {
  fs.mkdirSync(shotsDir, { recursive: true });
  const routes = [
    ['home', '/'],
    ['services', '/services'],
    ['gallery', '/gallery/custom'],
    ['quote', '/quote'],
  ];
  await capture(undefined, 'demo', routes);
  if (fs.existsSync(liveDist)) await capture(liveDist, 'live', routes);
}

await browser.close();
server.close();

console.log(`Pages crawled (${visited.size}):`);
for (const key of visited) console.log(`  ${new URL(key).pathname}`);
console.log(
  `Requests observed: ${log.requests.size}, declared assets checked: ${log.declaredAssets.size}`,
);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const message of [...new Set(failures)]) console.error(`  - ${message}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
