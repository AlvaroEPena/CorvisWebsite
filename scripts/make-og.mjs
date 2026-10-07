// Generates public/og.png (1200x630) from an inline SVG. Run: node scripts/make-og.mjs
import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
import sharp from 'sharp';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="peach" cx="85%" cy="0%" r="60%"><stop offset="0" stop-color="#ffc083" stop-opacity=".75"/><stop offset="1" stop-color="#ffc083" stop-opacity="0"/></radialGradient>
    <radialGradient id="lav" cx="0%" cy="100%" r="55%"><stop offset="0" stop-color="#7c7cff" stop-opacity=".35"/><stop offset="1" stop-color="#7c7cff" stop-opacity="0"/></radialGradient>
    <radialGradient id="shell" cx="42%" cy="38%" r="70%"><stop offset="0" stop-color="#6d6dff"/><stop offset=".55" stop-color="#2f31b8"/><stop offset="1" stop-color="#14163f"/></radialGradient>
    <radialGradient id="core" cx="50%" cy="54%" r="50%"><stop offset="0" stop-color="#fff3e0"/><stop offset=".25" stop-color="#ffc083"/><stop offset=".5" stop-color="#ff8a2b"/><stop offset="1" stop-color="#ff8a2b" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset=".6" stop-color="#ff8a2b" stop-opacity=".45"/><stop offset="1" stop-color="#ff8a2b" stop-opacity="0"/></radialGradient>
    <linearGradient id="vision" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f26b0e"/><stop offset="1" stop-color="#c4410a"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#f5f3ef"/>
  <rect width="1200" height="630" fill="url(#peach)"/>
  <rect width="1200" height="630" fill="url(#lav)"/>
  <circle cx="900" cy="315" r="300" fill="url(#halo)"/>
  <circle cx="900" cy="315" r="215" fill="url(#shell)"/>
  <circle cx="900" cy="325" r="190" fill="url(#core)"/>
  <ellipse cx="830" cy="210" rx="70" ry="30" fill="#fff" opacity=".45" transform="rotate(-28 830 210)"/>
  <rect x="1010" y="120" width="70" height="170" rx="35" fill="#ff8a2b" transform="rotate(24 1045 205)"/>
  <circle cx="1060" cy="500" r="26" fill="#fff" stroke="#d9d6ff" stroke-width="2"/>
  <g font-family="Segoe UI, Arial, Helvetica, sans-serif" font-weight="700">
    <text x="80" y="110" font-size="40" fill="#0e1024">Corvis</text>
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
