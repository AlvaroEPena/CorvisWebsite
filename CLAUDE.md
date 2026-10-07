# Corvis — Project Rules

Single-page marketing site for Corvis ("Core Vision", slogan "The Core Vision"), a web design
studio. Part of the web-dev-agent workspace; this folder is an independent project
(own deps, own git repo).

## Read first

- `docs/brief.md`: what the owner wants
- `docs/spec.md`: architecture, contracts, file ownership (source of truth)
- `docs/research.md`: stack decisions and glass-performance rules
- `docs/progress.md`: current phase and next step

## Stack

Astro 7 (static) · TypeScript 6 strict · Tailwind 4 + `glass.css` · CSS scroll animations +
lazy GSAP · Zod 4 · Cloudflare Worker (`src/worker`) with Resend + Turnstile · Vitest 5 ·
Playwright + axe · Cloudflare Workers static assets.

## Commands (run from this folder)

- `npm run dev`: Astro dev server, port 4328 (no Worker; form runs in demo mode)
- `npm run dev:worker`: build, then `wrangler dev` (static assets + `/api/contact`)
- `npm run check`: typecheck + lint + format check + unit tests
- `npm run build`: production build
- `npm run test:e2e`: Playwright (builds and previews on port 4329)

## Conventions

- Follow `../../.claude/skills/build-site/references/engineering-standards.md`.
- Contracts live in `src/lib/contracts/` (orchestrator-owned). Change via the orchestrator and update spec §6.
- Copy and business facts live only in `src/content/*.ts`; never hard-code them in components.
- Glass rules (spec §9): few `backdrop-filter` elements, never animate blurred elements,
  literal values plus `-webkit-` prefix, fallback tier for reduced transparency/motion.
- Content must be visible without JS; animate transform/opacity only.
- Placeholder prices/testimonials/projects are flagged in code; never emit fake ratings in JSON-LD.
- Env vars: see `.env.example`. Never commit `.env` or `.dev.vars`.
