#!/usr/bin/env node
/**
 * Crawls the shipped Grit demo like the /sandbox iframe would load it, from a Cloudflare-like
 * static server over Corvis `public/`. Run from the Corvis folder:
 *
 *   node scripts/demo-grit/verify.mjs [--shots <dir>] [--live <source dist dir>]
 *
 * Asserts: every page and asset answers 200 (all srcset candidates and lightbox hrefs included),
 * no failed requests, no console errors, no third-party hosts, noindex on every page, internal
 * links stay under the base path, external links open in a new tab with rel=noopener, the nav
 * works at 1440 and 390 and marks the current section, the project filter and lightbox work, and
 * both forms (quote, job inquiry) show the preview message while making NO network request.
 * Optional screenshots at 1440 and 390 wide, plus the same pages from the source project's own
 * build (`--live`) for a side-by-side fidelity check.
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

/** Wires the failure collectors every page in this run shares. */
function watchPage(page, label, log) {
  page.on('response', (response) => {
    const requested = new URL(response.url());
    log.requests.add(response.url());
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
}

/** Visits one page; returns its distinct internal page links. */
async function auditPage(context, url, log) {
  const page = await context.newPage();
  const label = new URL(url).pathname;
  watchPage(page, label, log);

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
      resolved.search = '';
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

/** Opens a page, fails the run on invalid submit not flagging fields, then submits a valid form. */
async function checkForm({ route, kind, fill }) {
  const page = await context.newPage();
  const label = `${route} (${kind} form)`;
  await page.goto(`${origin}${basePath}${route}`);
  const form = page.locator(`form[data-grit-form="${kind}"]`);
  if (await form.getAttribute('action')) fail(`${label}: form has an action`);
  if ((await form.getAttribute('method')) !== 'dialog') fail(`${label}: form method is not dialog`);

  await form.locator('[data-form-submit]').click();
  await page
    .locator('[data-form-status]')
    .filter({ hasText: /need/ })
    .waitFor({ timeout: 8000 })
    .catch(() => fail(`${label}: invalid submit showed no field errors`));
  if (await form.locator('[data-form-success]:not([hidden])').count())
    fail(`${label}: invalid form showed the confirmation`);

  await fill(form);
  const sent = [];
  page.on('request', (request) => sent.push(`${request.method()} ${request.url()}`));
  await form.locator('[data-form-submit]').click();
  const confirmation = form.locator('[data-form-success]');
  await confirmation
    .waitFor({ state: 'visible', timeout: 8000 })
    .catch(() => fail(`${label}: preview confirmation did not appear`));
  const text = (await confirmation.textContent()) ?? '';
  if (!text.includes(previewMessage)) fail(`${label}: confirmation lacks "${previewMessage}"`);
  if (/received|thanks/i.test(text)) fail(`${label}: confirmation claims the request was received`);
  await page.waitForTimeout(500);
  if (sent.length) fail(`${label}: submit made network requests: ${sent.join(', ')}`);
  if (shotsDir) {
    fs.mkdirSync(shotsDir, { recursive: true });
    await page.screenshot({ path: path.join(shotsDir, `${kind}-submitted-1440.png`) });
  }
  await page.close();
}

await checkForm({
  route: '/contact',
  kind: 'inquiry',
  fill: async (form) => {
    await form.locator('#name').fill('Demo Visitor');
    await form.locator('#company').fill('Example Agency');
    await form.locator('#email').fill('visitor@example.com');
    await form.locator('select[name="projectType"]').selectOption({ index: 1 });
    await form.locator('#location').fill('Example County');
    await form.locator('#message').fill('Testing the preview form with a long enough message.');
  },
});
await checkForm({
  route: '/careers',
  kind: 'job',
  fill: async (form) => {
    await form.locator('#name').fill('Demo Visitor');
    await form.locator('#email').fill('visitor@example.com');
    await form.locator('#message').fill('Testing the preview form with a long enough message.');
  },
});

const currentOf = async (page) =>
  (await page.locator('nav[aria-label="Primary"] a[aria-current="page"]').allTextContents())
    .map((text) => text.trim())
    .join();

// Nav at 1440: clicking a link navigates under the base and marks the section as current.
{
  const page = await context.newPage();
  await page.goto(`${origin}${basePath}/`);
  await page.locator('nav[aria-label="Primary"] a', { hasText: 'Projects' }).click();
  await page.waitForURL(`${origin}${basePath}/projects`);
  if ((await currentOf(page)) !== 'Projects')
    fail(`nav 1440: current item on /projects is "${await currentOf(page)}"`);
  await page.goto(`${origin}${basePath}/projects/creek-bridge-cfrp`);
  if ((await currentOf(page)) !== 'Projects')
    fail(`nav 1440: current item on a project page is "${await currentOf(page)}"`);
  await page.close();
}

// Nav at 390: the full-screen menu opens, lists the pages and navigates.
{
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await phone.newPage();
  watchPage(page, 'mobile nav', log);
  await page.goto(`${origin}${basePath}/`);
  const horizontal = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (horizontal) fail('390px: page scrolls horizontally');
  await page.locator('[data-menu-open]').click();
  await page.locator('dialog#mobile-menu[open]').waitFor({ timeout: 5000 });
  await page.locator('dialog#mobile-menu a', { hasText: 'Careers' }).first().click();
  await page.waitForURL(`${origin}${basePath}/careers`);
  await phone.close();
}

// Projects filter: choosing a category hides non-matching cards.
{
  const page = await context.newPage();
  await page.goto(`${origin}${basePath}/projects`);
  const cards = page.locator('[data-project-card]');
  const total = await cards.count();
  await page.locator('button[data-filter]:not([data-filter="all"])').first().click();
  const visible = await page.locator('[data-project-card]:not([hidden])').count();
  if (!(visible > 0 && visible < total)) fail(`projects filter: ${visible} of ${total} visible`);
  await page.close();
}

// Lightbox: a project photo click opens the dialog, Escape closes it, the credit link is external.
{
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  await page.goto(`${origin}${basePath}/projects/creek-bridge-cfrp`);
  await page.locator('a[data-lightbox-item]').first().click();
  try {
    const dialog = page.locator('dialog[data-lightbox][open]');
    await dialog.waitFor({ timeout: 8000 });
    await page.waitForFunction(
      () => {
        const image = document.querySelector('[data-lightbox-image]');
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 10;
      },
      undefined,
      { timeout: 8000 },
    );
    const credit = dialog.locator('[data-lightbox-credit]');
    if ((await credit.getAttribute('target')) !== '_blank') fail('lightbox: credit not external');
    if (!(await credit.getAttribute('href'))?.startsWith('https://unsplash.com/'))
      fail('lightbox: credit link does not point at the photo source');
    await page.keyboard.press('Escape');
    await page.locator('dialog[data-lightbox][open]').waitFor({ state: 'detached', timeout: 8000 });
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
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(shotsDir, `${prefix}-${name}-${width}.png`),
        fullPage: true,
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
    ['service', '/services/deck-overlays'],
    ['projects', '/projects'],
    ['contact', '/contact'],
  ];
  await capture(undefined, 'demo', routes);
  if (fs.existsSync(liveDist)) await capture(liveDist, 'source', routes);
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
