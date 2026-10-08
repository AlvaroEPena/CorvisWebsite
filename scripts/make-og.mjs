// Generates public/og.png (1200x630) from an inline SVG built around the Corvis mark.
// Run: node scripts/make-og.mjs
import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
import sharp from 'sharp';

import { placedMark } from './brand-mark-svg.mjs';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="peach" cx="85%" cy="0%" r="60%"><stop offset="0" stop-color="#ffc083" stop-opacity=".7"/><stop offset="1" stop-color="#ffc083" stop-opacity="0"/></radialGradient>
    <radialGradient id="lav" cx="0%" cy="100%" r="55%"><stop offset="0" stop-color="#7c7cff" stop-opacity=".35"/><stop offset="1" stop-color="#7c7cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset=".4" stop-color="#7c7cff" stop-opacity=".28"/><stop offset="1" stop-color="#7c7cff" stop-opacity="0"/></radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".98"/><stop offset="1" stop-color="#e4e4ff" stop-opacity=".7"/></linearGradient>
    <radialGradient id="spec" cx="25%" cy="0%" r="90%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="28" stdDeviation="26" flood-color="#3b3bd6" flood-opacity=".3"/></filter>
    <linearGradient id="vision" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f26b0e"/><stop offset="1" stop-color="#c4410a"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#f5f3ef"/>
  <rect width="1200" height="630" fill="url(#peach)"/>
  <rect width="1200" height="630" fill="url(#lav)"/>
  <circle cx="900" cy="315" r="330" fill="url(#halo)"/>
  <g filter="url(#soft)">
    <rect x="740" y="155" width="320" height="320" rx="86" fill="url(#glass)" stroke="#fff" stroke-width="3"/>
  </g>
  <rect x="740" y="155" width="320" height="320" rx="86" fill="url(#spec)" opacity=".7"/>
  <rect x="741.5" y="156.5" width="317" height="317" rx="84.5" fill="none" stroke="#fff" stroke-width="3" opacity=".9"/>
  ${placedMark({ x: 826, y: 205, height: 220 })}
  <rect x="80" y="70" width="64" height="64" rx="20" fill="url(#glass)" stroke="#fff" stroke-width="2"/>
  ${placedMark({ x: 99, y: 84, height: 36 })}
  <g font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="700">
    <text x="162" y="115" font-size="40" fill="#0e1024">Corvis</text>
    <text x="80" y="330" font-size="132" letter-spacing="-5" fill="#0e1024">The Core</text>
    <text x="80" y="460" font-size="132" letter-spacing="-5" fill="url(#vision)">Vision.</text>
  </g>
  <text x="84" y="540" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="30" fill="#4a4d6b">Web design studio. Redesigns and new builds.</text>
</svg>`;

await writeFile(
  new URL('../public/og.png', import.meta.url),
  await sharp(Buffer.from(svg)).png().toBuffer(),
);
console.log('Wrote public/og.png');
