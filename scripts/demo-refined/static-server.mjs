import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const isFile = (file) => fs.existsSync(file) && fs.statSync(file).isFile();

/**
 * Cloudflare `html_handling: auto-trailing-slash`, in miniature: "/x/" serves x/index.html,
 * "/x" serves x.html, and the other form redirects to the one that exists.
 * @returns {{ file: string } | { redirect: string } | undefined}
 */
export function resolveRequest(root, pathname) {
  const clean = path.normalize(decodeURIComponent(pathname)).replace(/^([\\/])+/, '');
  const target = path.join(root, clean);
  if (!target.startsWith(root)) return undefined;
  if (pathname.endsWith('/')) {
    if (isFile(path.join(target, 'index.html'))) return { file: path.join(target, 'index.html') };
    const sibling = `${target.replace(/[\\/]+$/, '')}.html`;
    return isFile(sibling) ? { redirect: pathname.replace(/\/+$/, '') } : undefined;
  }
  if (isFile(target)) return { file: target };
  if (isFile(`${target}.html`)) return { file: `${target}.html` };
  return isFile(path.join(target, 'index.html')) ? { redirect: `${pathname}/` } : undefined;
}

/** Serves `root` (Corvis `public/`, so /demos/... resolves) on a free port; resolves to the server. */
export function startStaticServer(root, port = 0) {
  const server = http.createServer((request, response) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    const resolved = resolveRequest(root, pathname);
    if (!resolved) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    if ('redirect' in resolved) {
      response.writeHead(308, { location: resolved.redirect }).end();
      return;
    }
    const type = MIME[path.extname(resolved.file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    fs.createReadStream(resolved.file).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
