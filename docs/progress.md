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
