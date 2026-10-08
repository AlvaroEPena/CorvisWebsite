import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Dev-only Astro integration: makes `/demos/*` URLs resolve like Cloudflare's `html_handling: auto-trailing-slash`
 * (`/x` -> `x.html`, `/x/` -> `x/index.html`) so the sandbox demos navigate the same in dev as in production.
 */
export function demosRouting(publicDir = join(process.cwd(), 'public')) {
  const isFile = (path) => existsSync(path) && statSync(path).isFile();
  return {
    name: 'corvis-demos-routing',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const handle = (req, _res, next) => {
          if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
          const [pathname, query = ''] = req.url.split('?');
          if (!pathname.startsWith('/demos/')) return next();
          const decoded = decodeURIComponent(pathname);
          const last = decoded.split('/').pop() ?? '';
          if (last.includes('.')) return next();
          const candidates = decoded.endsWith('/')
            ? [`${decoded}index.html`]
            : [`${decoded}.html`, `${decoded}/index.html`];
          const hit = candidates.find((candidate) => isFile(join(publicDir, candidate)));
          if (hit) req.url = hit + (query ? `?${query}` : '');
          next();
        };
        // Put the handler first so Astro's trailing-slash handling cannot 404 these URLs before we rewrite them.
        server.middlewares.stack.unshift({ route: '', handle });
      },
    },
  };
}
