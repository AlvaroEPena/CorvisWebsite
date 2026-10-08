#!/usr/bin/env node
/**
 * Crawls the shipped Refined Celebrations demo like the /sandbox iframe would load it, from a
 * Cloudflare-like static server over Corvis `public/`. Run from the Corvis folder:
 *
 *   node scripts/demo-refined/verify.mjs [--shots <dir>]
 *
 * Asserts: every page and asset answers 200, no failed requests, no console errors, no third-party
 * hosts, noindex on every page, nav/internal links stay under the base path, external links open
 * in a new tab with rel=noopener, the inquiry panel text replaces the embed, and the PhotoSwipe
 * lightbox opens. Optional screenshots at 1440 and 390 wide.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { basePath, corvisRoot, inquiryPanelText } from './config.mjs';
import { startStaticServer } from './static-server.mjs';

const shotsIndex = process.argv.indexOf('--shots');
const shotsDir = shotsIndex > -1 ? path.resolve(process.argv[shotsIndex + 1]) : undefined;
const failures = [];
const fail = (message) => failures.push(message);

const server = await startStaticServer(path.join(corvisRoot, 'public'));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();

/** Visits one page; returns its distinct internal link targets. */
async function auditPage(context, url, pageLog) {
  const page = await context.newPage();
  const label = new URL(url).pathname;
  page.on('response', (response) => {
    const requested = new URL(response.url());
    pageLog.requests.add(response.url());
    if (requested.origin !== origin && !requested.protocol.startsWith('data')) {
      fail(`${label}: third-party response ${response.url()}`);
    } else if (response.status() >= 400) {
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
  // Scroll through the page so lazy images and reveal-on-scroll content actually load.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle');

  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute('content', { timeout: 2000 })
    .catch(() => null);
  if (robots !== 'noindex, nofollow') fail(`${label}: robots meta is "${robots}"`);
  if (await page.locator('link[rel="canonical"]').count()) fail(`${label}: canonical link present`);

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
        pageLog.declaredAssets.add(resolved.href);
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
  for (const asset of assetUrls) pageLog.declaredAssets.add(asset);
  return { page, internal };
}

const pagesLog = { requests: new Set(), declaredAssets: new Set() };
const visited = new Map();
const queue = [`${origin}${basePath}/`];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

while (queue.length) {
  const url = queue.shift();
  const key = url.replace(/\/$/, '');
  if (visited.has(key)) continue;
  console.log(`crawling ${url}`);
  const { page, internal } = await auditPage(context, url, pagesLog);
  visited.set(key, true);
  for (const link of internal) queue.push(link);
  await page.close();
}

// Every URL a page declares (including unused srcset candidates) must exist.
for (const asset of pagesLog.declaredAssets) {
  if (!asset.startsWith(origin)) {
    if (!asset.startsWith('data:')) fail(`declared third-party URL: ${asset}`);
    continue;
  }
  const response = await fetch(asset);
  if (response.status !== 200) fail(`declared asset HTTP ${response.status}: ${asset}`);
}

// Inquiry pages: the panel replaces the embed, and nothing else loads.
for (const slug of ['chat-events', 'chat-photography']) {
  const page = await context.newPage();
  await page.goto(`${origin}${basePath}/${slug}`);
  const panel = page.locator('.demo-inquiry');
  const text = (await page.locator('.demo-inquiry-text').textContent())?.trim();
  if (text !== inquiryPanelText) fail(`${slug}: inquiry panel text is "${text}"`);
  if (shotsDir) {
    fs.mkdirSync(shotsDir, { recursive: true });
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(shotsDir, `inquiry-${slug}-1440.png`) });
  }
  await page.close();
}

// Lightbox: a gallery click opens PhotoSwipe, Escape closes it.
const galleryPage = await context.newPage();
const galleryErrors = [];
galleryPage.on(
  'console',
  (message) => message.type() === 'error' && galleryErrors.push(message.text()),
);
await galleryPage.goto(`${origin}${basePath}/portfolio/weddings`);
await galleryPage.locator('a[data-pswp-width]').first().click();
try {
  await galleryPage.locator('.pswp--open').waitFor({ timeout: 8000 });
  await galleryPage.locator('.pswp__img').first().waitFor({ timeout: 8000 });
  // Escape is ignored while the open animation is still running.
  await galleryPage.locator('.pswp--ui-visible').waitFor({ timeout: 8000 });
  await galleryPage.waitForTimeout(600);
  await galleryPage.keyboard.press('Escape');
  await galleryPage.locator('.pswp--open').waitFor({ state: 'detached', timeout: 8000 });
} catch (error) {
  fail(`lightbox did not open/close: ${error.message}`);
}
galleryErrors.forEach((message) => fail(`lightbox console error: ${message}`));
await galleryPage.close();

if (shotsDir) {
  fs.mkdirSync(shotsDir, { recursive: true });
  for (const [name, size, route] of [
    ['home-1440', { width: 1440, height: 900 }, '/'],
    ['home-390', { width: 390, height: 844 }, '/'],
    ['portfolio-1440', { width: 1440, height: 900 }, '/portfolio/weddings'],
    ['portfolio-390', { width: 390, height: 844 }, '/portfolio/weddings'],
    ['inquiry-390', { width: 390, height: 844 }, '/chat-events'],
  ]) {
    const shotContext = await browser.newContext({ viewport: size });
    const page = await shotContext.newPage();
    await page.goto(`${origin}${basePath}${route}`);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(shotsDir, `${name}.png`),
      fullPage: name.startsWith('home'),
    });
    await shotContext.close();
  }
}

await browser.close();
server.close();

console.log(`Pages crawled (${visited.size}):`);
for (const key of visited.keys()) console.log(`  ${new URL(key).pathname}`);
console.log(
  `Requests observed: ${pagesLog.requests.size}, declared assets checked: ${pagesLog.declaredAssets.size}`,
);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const message of [...new Set(failures)]) console.error(`  - ${message}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
