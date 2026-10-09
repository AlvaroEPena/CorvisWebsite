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

## 2026-10-09 — Hero logo light sweep fix

- Pixelation and flicker came from animating a bar behind an SVG mask (re-rasterized each frame at low resolution). The sweep is now a gradient painted directly on the ring and chevron strokes, animated with SVG (SMIL) and started/paused by `scripts/hero-mark.ts`; no mask, no moving layer. Chevron overlay uses flat ends. Static under reduced motion and Save-Data.
- Verified at 2x device pixel ratio frames; typecheck/lint/format clean, 173 unit, 367 e2e passed / 0 failed.

## 2026-10-09 — Round 5 (owner): reviews page + admin, team page, founders: done

- Copy trimmed (Work callout; testimonials note removed). 11 fictional reviews in `src/content/reviews.json` (validated by `src/lib/reviews.ts`; `placeholder` stays data-only; never Review JSON-LD). Home preview shows the `featured` ones; `/reviews` lists all; "View their new site" is a disabled button until `siteHref` is set (one links to the sandbox).
- `/admin` (Sveltia CMS, GitHub token sign-in, no OAuth Worker): add/remove/edit/reorder reviews and tick home-page ones; each Save commits to `AlvaroEPena/CorvisWebsite` `main`. Guide: `docs/admin-setup.md`. Untried until the owner signs in with a real token. `/admin` is noindex, no-store, unframed, out of the sitemap and robots.
- `/team` "Meet the team" (Alvaro Peña, Founder & Tech Lead; Aaron Peña-Diamond, Co-Founder, business and sales). Nav order: Services, Work, Redesign, Process, Pricing, FAQ, Meet the team, Sandbox. Footer and JSON-LD list both founders.
- Verified: typecheck/lint/format clean, 196 unit, 438 e2e passed / 0 failed, Lighthouse `/` 99, `/reviews` 100, `/team` 100 (mobile), A11y 100.
- Reminder: replace the fictional reviews with real client reviews before promoting the site.

## 2026-10-09 — Round 6 (owner): Home reviews editor, Meet the team CTA, team photos: done

- Reviews restructured to one file per review (`src/content/reviews/*.json`) with two editors over the same files (All reviews, Home reviews); verified in the real Sveltia UI with mocked GitHub (reorder commit diffs only `homeOrder`, edit keeps all fields, untick removes from Home list, add creates one file).
- Home "Meet the team" pill (avatar stack, larger than "More reviews"). /team shows Alvaro's cropped photo and a designed placeholder for Aaron; script `scripts/make-team-photos.mjs` adds his later.
- Verified: typecheck/lint/format clean, 214 unit, 457 e2e passed / 0 failed, Lighthouse `/` 99, `/team` 100, `/reviews` 100 (mobile), A11y 100.
- Owner-run checks still pending: real GitHub token Save from /admin (mocked only so far).

## 2026-10-09 — Round 7 (owner): sync, remove-from-home button, reviews-page toggle, nav: done

- `showOnReviewsPage` toggle in both editors; confirm-gated "Remove from home screen" (custom field) in Home reviews; Reviews link added to navbar after Sandbox (burger below 1120px).
- Verified in the mocked-GitHub editor harness: confirm/cancel, single-field commits. Verified: typecheck/lint/format clean, 220 unit, 489 e2e passed / 0 failed, Lighthouse `/` 100, `/reviews` 100 (mobile).
- Still to do by owner: real token Save from the live /admin; empty-state copy for /reviews to confirm.

## 2026-10-09 — Rounds 8-9 (owner): live home previews, Mod Labs, search: done

- Scroll-through timing fixed (start when fully visible, ~1 s holds). Home slider and Work previews show the real demo builds with live water. Mod Labs added to sandbox, Work and demos. SEO structured data/title/verification hooks, `docs/seo-checklist.md`.
- Verified: typecheck/lint/format clean, 245 unit, 533 e2e passed / 0 failed, Lighthouse `/` mobile 99 (desktop 100), `/sandbox` 100, A11y 100, SEO 100.
- Owner steps pending: push; test a real /admin Save; Search Console sitemap shows "Couldn't fetch" at first (normal, retry in 1-3 days); add "Website by Corvis" footers to Mod Labs and Refined; replace fictional reviews with real ones before promoting.

## 2026-10-09 — Round 9 (owner): smooth previews: done

- Cause of choppiness: integer scroll quantization (per-frame step SD 0.53 px to 0.005 px after fix), plus hidden scroll bar, no hover pause, time-based holds/ramps, same-size Work previews, "Preview Loading" placeholder with cross-fade.
- Verified: typecheck/lint/format clean, 253 unit, 550 e2e passed / 0 failed, Lighthouse `/` and `/sandbox` mobile 100/100/100/100.

## 2026-10-09 — Round 10 (owner): browser frame on slider, traffic lights, nav merge, nav highlight: done

- Red/yellow/green lights on Work previews; before/after now sits in a fake browser window with the split starting under the address bar; Redesign folded into Work in nav and footer; "run by Alvaro" removed from Mod Labs copy; navbar scroll highlight with gliding glass pill.
- Verified: typecheck/lint/format clean, 258 unit, 562 e2e passed / 0 failed.

## 2026-10-09 — Headshot sharpness fix

- Cause: the portrait was encoded twice (AVIF q58 by `scripts/make-team-photos.mjs`, then again at q42 by astro:assets). Now the script writes JPEG q95 4:4:4 masters (`<id>-card.jpg` 800x1000, `<id>-avatar.jpg` 288x288, Lanczos plus light sharpen) and the site encodes them once (card q55, widths 320/480/640/800; avatar q75). `/team` mobile LCP about 1.8 to 2.0 s (was 1.5 s with the soft image), Performance 97 to 99.

## 2026-10-09 — Round 11: Grit concept project: done

- Grit demo, sandbox card (4th) and Work showcase (3rd, "Concept project"); live-sites timing tests relaxed for slow headless GL (start under 6 s, longest still under 1.5 s).
- Verified: typecheck/lint/format clean, 260 unit, e2e 571+ passed with timing tests stable over repeated runs, Lighthouse `/` and `/sandbox` 100 on all categories (mobile).

## 2026-10-09 — Headshot from Alvaro-Fixed.jpg

- Switched the source to `C:\Users\Alvaro\Desktop\Alvaro-Fixed.jpg` (2528x1686, already colour-corrected, about 2.5x the pixels of the old TIF). Same crop fractions; tonal polish switched off for it (`polish: false` in `scripts/make-team-photos.mjs`); masters 1000x1250 card and 384x384 avatar; delivered widths 320 to 1000. `/team` mobile LCP 1.7 s, Performance 99 to 100. The previous master is in git history (commit feb5f1f) if needed.

## 2026-10-09 — Aaron's headshot

- Added from `C:\Users\Alvaro\Desktop\Aaron_Pena-Diamond_Headshot.jpeg` (2528x1684) with `node scripts/make-team-photos.mjs aaron <path>`; crops in the CROPS table (card 4:5 centred on the face, square avatar around the head), polish off. The designed placeholder stays in `src/assets/team/aaron-placeholder.svg` as the fallback for any founder without photos. Tests updated for two real photos.

## 2026-10-09 — Round 12: pricing, copy and structure pass

- Prices are plain numbers site-wide (no `$`): Launchpad Foundation from 3,800 (up to 5 pages, up to 400 words each, two edit rounds), Market Leader from 4,940 ("Information visibility on up to 10 service and location pages", copy included), Fully Managed Digital Infrastructure 274 per month, worded as everything in both packages plus ongoing care. `formatPrice` no longer adds a currency symbol; contact budget labels too.
- Removed: deposit buttons and checkout script/tests (the Worker `/api/checkout` and PandaDoc code stay, unused by the page), "Hosting included" and "You own everything" chips, spam-protection wording. Added "Instant email lead alerts" to both packages and the proof chips. "Book a free consult" is the only package button (also on the managed plan).
- FAQ rewritten for subscription ownership (buy-out, minimum term written in the proposal).
- Process: the route draws itself and the stops appear on scroll (CSS scroll-driven animation, longhand properties so the build cannot merge them into a shorthand old browsers reject; text always visible; reduced motion shows the finished route).
- Reviews: `company` replaced by `industry` (schema, admin, files); `/reviews` page kept but not linked from the nav or footer; the "More reviews" button on the home page stays.
- Consult copy: "as fast as 15 minutes". Titles: Alvaro "Co-Founder & Tech Lead", Aaron "Co-Founder & Vision Lead" (footer, team page, JSON-LD, photo alt).
- `settleAnimations` test helper now ignores scroll-driven animations.
- Verified: typecheck 0 errors, lint/format clean, 254 unit, e2e all projects green after fixes, Lighthouse `/` mobile 100 / a11y 100 / BP 100 / SEO 100, LCP 1.5 s.
- Open: no calendar/CRM is attached to "Book a free consult" yet (the form emails the owner).

## 2026-10-09 — Stripe and PandaDoc removed; forms ready for live keys

- Deleted all Stripe checkout/webhook and PandaDoc code, contracts, tests, env vars, README and privacy text, and the `/thanks` page. The Worker now serves only `POST /api/contact` (Turnstile, honeypot, rate limit, Resend email).
- Going live needs the owner's values: build variable `PUBLIC_TURNSTILE_SITE_KEY`; Worker secrets `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`; then delete the `ENVIRONMENT` secret. See README "Accounts and secrets".
- Verified: typecheck 0 errors, lint/format clean, 204 unit, e2e 517 passed.

## 2026-10-09 - ENVIRONMENT modes

- `ENVIRONMENT=production|development`, default development. Development ignores real keys (Turnstile test secret, leads logged not emailed); production requires every key and fails closed. `.env` (git-ignored) created from `.env.example`. 206 unit tests pass.

## 2026-10-09 - Desktop process timeline pins and fills on scroll

- Desktop with a pointer (min 64rem, hover, no reduced motion): the Process section is pinned (CSS `position: sticky`, native scrolling) with the timeline centred; scroll position fills the thread and lights each stop (`src/scripts/process-pin.ts`, maths in `process-pin-math.ts`). When full, and scrolling has paused (so nav smooth scrolls are never cut short), the extra pinned length is removed with a compensating scroll so nothing jumps; it never pins again that page load. Phones, touch and reduced motion keep the scroll-drawn version / finished route. Text is always visible.
- Playwright now builds with Cloudflare's test Turnstile key regardless of the local `.env`.

## 2026-10-09 - Reviews on/off switch

- `src/content/reviews-settings.json` (`showReviews`, default false) edited in /admin under Website settings. Off: no Reviews nav/footer links, no `/reviews` page (`src/pages/[slug].astro` builds it only when on, so it leaves the sitemap too), and the button beside Meet the team is **View Sandbox**. On: those return and the button is **More reviews**. Reviews and home quotes are untouched.
- Tests adapt to the setting (`reviewsOn` in tests/e2e/support.ts); verified both states in e2e, plus an admin test that Save writes `{ "showReviews": true }`.

## 2026-10-09 - Touch fixes: Work previews and the phone timeline

- Work/slider previews: a see-through shield (`.live-stage::after`, `touch-action: pan-y pinch-zoom`) now takes every touch, the demo iframe is `scrolling="no"` and its page is `overflow: hidden`, so a finger across a preview just scrolls the page and only the animation moves the demo.
- Phone timeline (touch, no reduced motion): each stop lights when its top reaches the middle of the screen, then stays lit for the page load (`updateTouch` in `process-pin.ts`; thread length from the last lit stop). Replaces the scroll-driven scrub. A refresh starts over; no JS or reduced motion shows the finished route.

## 2026-10-09 - SEO round 2 (audit follow-up)

- See docs/seo-checklist.md "Round 2". New: location/definition copy, four service pages, Person and BreadcrumbList schema, llms.txt, sitemap lastmod, live client links, redesign section retitled.
- Verified: typecheck 0 errors, lint/format clean, 222 unit, e2e green after fixing the tests the changes touched (title, Work outbound links), Lighthouse `/` and `/services/web-design` 100 on all categories, `/team` 99.

## 2026-10-09 - Performance pass (no visual change)

- Measured first: home 163 KB total, TBT 0, CLS 0, Lighthouse 100; the large scripts in `dist/_astro` belong to /admin only and are not loaded by public pages.
- Change: the body font (Inter 400 and 600) is now preloaded like the display font (`<Font cssVariable="--face-body" preload />` in Layout.astro). Measured over 6 runs each: home FCP 1.51 s to 1.21 s (LCP unchanged at 1.51 s); /team FCP about 1.4 s to 1.1 s, CLS 0.02 to 0, score 99 to 100. Same fonts, same look.
- Looked at and left alone because they would change how it looks or feels: `content-visibility` on sections (risks scroll jumps and the pinned timeline maths), replacing the lazy GSAP parallax, longer caches on the unhashed demo files.
