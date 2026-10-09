# Corvis — The Core Vision

Single-page marketing site for Corvis, a web design studio. Light frosted-glass design,
Astro 7 static output, and a small Cloudflare Worker for the contact form (Turnstile check, email through Resend).

## Stack

Astro 7 · TypeScript 6 strict · Tailwind 4 + `glass.css` · CSS scroll animations + lazy GSAP ·
Zod 4 · Cloudflare Workers (static assets + `src/worker`) · Resend · Turnstile · Vitest 5 · Playwright + axe.

## Setup

```bash
npm install
cp .env.example .env          # public build-time vars (PUBLIC_*)
```

For the Worker locally create `.dev.vars` (git-ignored) from the Worker section of
`.env.example`, including `ENVIRONMENT=development` (enables test Turnstile secret and demo mode).

## Scripts

| Script                  | What it does                                                             |
| ----------------------- | ------------------------------------------------------------------------ |
| `npm run dev`           | Astro dev server on :4328 (no Worker, so forms show their failure state) |
| `npm run dev:worker`    | Build, then `wrangler dev`: static site + `/api/*`                       |
| `npm run check`         | typecheck + lint + format check + unit tests                             |
| `npm run build`         | Production build to `dist/`                                              |
| `npm run test:e2e`      | Playwright (desktop, mobile, reduced-motion) + axe on :4329              |
| `npm run release:check` | Fails while placeholder URL/email or missing Turnstile site key remain   |
| `npm run deploy`        | release:check, build, `wrangler deploy` (only with owner confirmation)   |

## Replace before launch

- `src/content/site.ts`: real site URL and contact email (release:check blocks `.example`).
- Prices (`src/content/pricing.ts`), testimonials
  (shown with a "Sample feedback" label), and portfolio projects are placeholders.
- Set `PUBLIC_SITE_URL` and `PUBLIC_TURNSTILE_SITE_KEY` at build time.

## Accounts and secrets (owner creates; never commit)

Set Worker secrets with `wrangler secret put <NAME>`:

- **Resend:** `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (verified sending domain).
- **Turnstile:** widget with your domain + `localhost`; `PUBLIC_TURNSTILE_SITE_KEY` (build) and
  `TURNSTILE_SECRET_KEY` (Worker; required in production, the Worker fails closed without it).
- **Cloudflare:** add WAF rate-limit rules for POST `/api/contact`
  (the in-Worker limiters are best effort per isolate).

## Deployment (Cloudflare Workers static assets)

`npm run deploy` after `wrangler login` and setting secrets. Point your domain at the Worker, then set
HSTS preload only once the domain is final (`public/_headers`).

## Known follow-ups

CSP still allows inline scripts (move to hashes). No calendar or CRM is attached to "Book a free consult" yet.
