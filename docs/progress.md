# Corvis — Progress

## 2026-10-07 — Phases 1–3

- Phase 1 intake done, brief confirmed by user.
- Phase 2 research done (docs/research.md): Astro 7 static + Tailwind 4 + GSAP lazy + CF Worker + Resend + Turnstile.
- Phase 3 spec drafted (docs/spec.md); awaiting user approval of stack/scope/design.
- Next: on approval, scaffold (Phase 4).

## 2026-10-07 — Phase 3 approved, Phase 4 scaffold done

- User approved stack, scope and design direction (spec §2, §9).
- Scaffolded by hand from the zydeco sibling (docs dir non-empty blocks `npm create astro`).
- Contract `src/lib/contracts/contact.ts`, worker stub, configs, tests; `npm run check` and `npm run build` pass.
- Dev ports: 4328 (dev), 4329 (e2e preview).
- Next: Phase 5, frontend-engineer + backend-engineer in parallel.

## 2026-10-08 — Phase 5 build done

- Frontend (all sections, slider, forms, /thanks, privacy) and Worker (contact, Stripe checkout + webhook, PandaDoc proposal, fail-closed Turnstile) built.
- Scope added by user: PandaDoc auto-proposal on lead + Stripe deposit checkout (spec §6b).
- `npm run check` (132 unit tests) and `npm run build` pass. Unused `resend` dep removed (plain fetch).
- Not yet run: e2e, axe, Lighthouse, live Stripe/PandaDoc (needs owner keys), real-device Safari glass check.
- Next: Phase 6 QA (qa-tester), Phase 7 review.

## 2026-10-08 — Phase 6 QA done

- qa-tester added e2e/a11y/responsive/SEO/motion suites (tests/e2e). Found: form errors wiped on fast submit, contrast in before/after mock, mobile LCP 2.4 s. All fixed.
- LCP fix: static font weights (display 700; body 400+600) instead of variable files + inlined stylesheets.
- Results: `npm run check` 134 unit tests pass; e2e 182 passed / 70 skipped by project gating / 0 failed; Lighthouse mobile Perf 100, A11y 100, LCP 1.5 s, CLS 0.
- Next: Phase 7 code review.

## 2026-10-08 — Phase 7 review done

- Reviewer: no Critical; verdict no-ship until High fixed. Fixed: visible "Sample feedback" label on placeholder testimonials; `npm run release:check` (blocks deploy on placeholder site URL/email or missing Turnstile site key); robots.txt now generated from site URL; `website` restricted to http(s); neutral form success copy; JSON-LD `<` escaped; spec §6 error codes updated; `npm run check` green.
- Deferred (Medium/Low, listed to owner): CSP `unsafe-inline` for scripts (use hashes later), checkout has no bot check beyond origin+rate limit (add WAF rule), webhook dedupe is per-isolate (KV later), PandaDoc auto-send must stay off until owner approves, deposit amounts hard-coded separately from pricing, `/thanks` copy not verified against session, HSTS preload only once domain is final, verify Stripe API version string before live.
- Next: Done. See README.

## 2026-10-08 — Phase 8 handoff: DONE

- README written; screenshots reviewed (desktop + mobile hero, services, pricing, slider).
- Owner to-do: real domain/email/prices/testimonials/projects, Resend/Turnstile/Stripe/PandaDoc accounts, deploy (explicit confirmation).

## 2026-10-08 — Change request round 2 (owner): done

- New packages: Launchpad $4,500, Market Leader $6,800, required managed plan $149/mo (spec §14). Deposits are placeholder 50% ($2,250 / $3,400). Phone-routing claim removed per owner.
- Hero dot-field, button micro-interactions, scroll-linked effects; real before/after redesign demo (old vs rebuilt pool-builder site, sanitized) with scroll-through; single sanitized sample project "Saltwater Row Outdoor Living" (original client's photos kept per owner decision, details removed, EXIF stripped).
- Verified: check (145 tests), build, e2e 215 pass / 0 fail, Lighthouse mobile 100/100/100/100 (LCP 1.6 s), no banned words, no real-business strings in dist.
- Claims the owner must be able to deliver: 14-day launch, up to 10 service/location pages, instant email alerts per client, hosting/security/backups with rollback, done-for-you copywriting.

## 2026-10-09 — Round 3 (owner): new logo, sandbox, Refined Celebrations: done

- New logo (owner PDF converted to vector, glass tile) everywhere; favicon set and OG regenerated.
- `/sandbox` test-drive page with project picker, Before/After toggle (only for projects with a before), device sizes, reload, fullscreen, deep links.
- Real before/after pool-builder demo (sanitized, working) and Refined Celebrations (real info, no before) embedded as same-origin demos.
- Work section now shows Refined Celebrations. One explore button under the before/after slider.
- Verified: typecheck 0 errors, lint and format clean, 168 unit tests, 330 e2e passed / 0 failed, Lighthouse `/` mobile 99, `/sandbox` mobile 100, A11y 100; all 667 demo assets return 200 under wrangler dev; headers verified with curl.

## 2026-10-09 — Round 4 (owner feedback): done

- Fixed inner-page navigation inside the Refined Celebrations demo on the dev server (dev-only rewrite in `scripts/vite-demos-routing.mjs`, wired in `astro.config.mjs`; production was already correct). Pool demos rebuilt with file-style extensionless links.
- "Live build" label is now "Built from scratch"; Sandbox is last in the navbar; new detailed glass hero logo (`HeroMark.astro`); hero now visible at first paint (removed opacity gate and GSAP entrance); proof numbers are static (count-up removed).
- Verified: typecheck/lint/format clean, 173 unit tests, 364 e2e passed / 0 failed, Lighthouse mobile `/` 100 and `/sandbox` 100, A11y 100.
