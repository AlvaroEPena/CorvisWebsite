// Generates the favicon set and the touch/logo icons from src/assets/brand/corvis-mark.svg.
// Run: node scripts/make-brand-assets.mjs   (writes into public/)
import { writeFile } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { squareViewBox } from '../src/lib/brand-mark.ts';
import { classedBody, squareMarkSvg } from './brand-mark-svg.mjs';

const publicFile = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const PEARL = '#f5f3ef';

// 1. Vector favicon. Tight padding keeps the strokes thick enough to read at 16px, and the
//    prefers-color-scheme rule keeps the chevron visible on dark tab bars.
const { viewBox, body } = classedBody();
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${squareViewBox(viewBox, 14)}">
<style>
.mark-ring{fill:none;stroke:#3b3bd6}
.mark-chevron{fill:none;stroke:#0e1024}
.mark-dot{fill:#ff8a2b}
@media (prefers-color-scheme:dark){.mark-ring{stroke:#8f8fff}.mark-chevron{stroke:#fff}}
</style>
${body}
</svg>
`;
await writeFile(publicFile('favicon.svg'), favicon);

// 2. Raster icons.
const render = (svg, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
const onPearl = (size, padding) =>
  render(squareMarkSvg({ padding }), size)
    .flatten({ background: PEARL })
    .png({ compressionLevel: 9 })
    .toBuffer();

// iOS fills transparency with black, so the touch icon and the structured-data logo sit on pearl.
await writeFile(publicFile('apple-touch-icon.png'), await onPearl(180, 110));
await writeFile(publicFile('logo-512.png'), await onPearl(512, 110));

// 3. favicon.ico: PNG frames inside an ICO container (16, 32, 48), transparent background.
const sizes = [16, 32, 48];
const frames = await Promise.all(
  sizes.map((size) =>
    render(squareMarkSvg({ padding: 12 }), size)
      .png()
      .toBuffer(),
  ),
);
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + 16 * index;
  header.writeUInt8(sizes[index] % 256, entry);
  header.writeUInt8(sizes[index] % 256, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(publicFile('favicon.ico'), Buffer.concat([header, ...frames]));
await writeFile(publicFile('favicon-32.png'), frames[1]);

console.log('Wrote favicon.svg, favicon.ico, favicon-32.png, apple-touch-icon.png, logo-512.png');
