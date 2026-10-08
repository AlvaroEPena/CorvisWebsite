#!/usr/bin/env node
/**
 * Compares the visible text of the shipped demo with plain-text copies of the reference pages and
 * fails on any verbatim run of 8 or more consecutive words.
 *
 *   node scripts/demo-grit/overlap-check.mjs <dir with *.txt reference pages> [demo dir] [minWords]
 *
 * The reference pages are fetched out of band (rendered page text saved as .txt files); they are
 * never copied into the repository.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { directoryStats, walkFiles } from '../demo-refined/fs-utils.mjs';
import { targetDir } from './config.mjs';
import { visibleText } from './html.mjs';
import { findVerbatimRuns } from './overlap.mjs';

const referenceDir = process.argv[2];
const demoDir = path.resolve(process.argv[3] ?? targetDir);
const minWords = Number(process.argv[4] ?? 8);
if (!referenceDir) {
  console.error('usage: overlap-check.mjs <reference dir> [demo dir] [minWords]');
  process.exit(2);
}

const referenceFiles = (await walkFiles(path.resolve(referenceDir))).filter((file) =>
  file.endsWith('.txt'),
);
const reference = (await Promise.all(referenceFiles.map((file) => fs.readFile(file, 'utf8')))).join(
  '\n',
);
const pages = (await walkFiles(demoDir)).filter((file) => file.endsWith('.html'));

let findings = 0;
for (const page of pages) {
  const text = visibleText(await fs.readFile(page, 'utf8'));
  for (const run of findVerbatimRuns(text, reference, minWords)) {
    findings += 1;
    console.error(`${path.relative(demoDir, page)}: ${run.words} words: "${run.text}"`);
  }
}
const { fileCount } = await directoryStats(demoDir);
console.log(
  `Checked ${pages.length} pages (${fileCount} files) against ${referenceFiles.length} reference pages: ${findings} overlapping runs of ${minWords}+ words.`,
);
process.exit(findings ? 1 : 0);
