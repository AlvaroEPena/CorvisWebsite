# Corvis — Spec

_Last updated: 2026-10-07 · Status: draft (awaiting approval)_

## 1. Summary

Corvis ("Core Vision", slogan **The Core Vision**) is a web design studio that redesigns
existing sites and builds new ones for businesses. This is a single-page, ultra-fast,
frosted-glass marketing site whose job is to convert visitors into consult requests.
MVP goal: premium look, Lighthouse 95+ on mobile, working contact form, complete sections.

## 2. Stack (from docs/research.md)

| Layer          | Choice                                                                                  | Version                                |
| -------------- | --------------------------------------------------------------------------------------- | -------------------------------------- |
| Framework      | Astro (static output)                                                                   | 7.3.6                                  |
| Language       | TypeScript strict                                                                       | 6.0.x (TS 7 blocked by @astrojs/check) |
| Styling        | Tailwind 4 (`@tailwindcss/vite`) + one hand-written `glass.css`                         | 4.3.3                                  |
| Motion         | CSS scroll-driven animations (`@supports`) + lazy GSAP/ScrollTrigger for hero/parallax  | gsap 3.15.0                            |
| Slider         | Custom ~1 KB TS (clip-path + `<input type=range>`)                                      | none                                   |
| 3D look        | Pre-rendered transparent AVIF/WebP objects + CSS/SVG gradients                          | n/a                                    |
| Images / fonts | `astro:assets` (sharp); Astro Fonts API, Fontsource: Bricolage Grotesque + Inter        | sharp 0.35.5                           |
| Validation     | Zod (shared by client and Worker)                                                       | 4.6.5                                  |
| Form backend   | Cloudflare Worker `POST /api/contact` (`run_worker_first: ["/api/*"]`)                  | wrangler 4.148.0                       |
| Email / spam   | Resend; honeypot + min-fill-time + Turnstile + Zod                                      | resend 6.32.1                          |
| SEO            | `@astrojs/sitemap`, JSON-LD ProfessionalService + FAQPage                               | 3.7.4                                  |
| Tests          | Vitest 5.0.3, Playwright 1.63.0 + axe 4.13.0, ESLint 10 / Prettier 3.9 / @astrojs/check |                                        |
| Hosting        | Cloudflare Workers static assets, `_headers`                                            | free tier                              |

## 3. Sitemap & pages

| Route               | Purpose                         | Rendering |
| ------------------- | ------------------------------- | --------- |
| `/`                 | Landing page, anchored sections | SSG       |
| `/privacy`          | Short privacy note (form data)  | SSG       |
| `/404`              | Branded not-found               | SSG       |
| `POST /api/contact` | Contact form handler (Worker)   | server    |

Home sections, in order (anchors): Nav (sticky glass pill) · `#hero` · `#proof` (strip: stats
and tech/value chips, no fake client logos) · `#services` · `#work` (portfolio) ·
`#redesign` (before/after slider) · `#process` · `#pricing` · `#testimonials` · `#faq` ·
`#contact` (form + "Book a free consult") · Footer.

## 4. User journeys (become e2e tests)

J1. Visitor lands → reads hero + slogan → clicks "Book a free consult" → scrolls to `#contact`.
J2. Visitor fills the form validly → submit → sees success state; Worker sends email (mocked in tests).
J3. Visitor submits an invalid form → inline accessible errors; nothing sent.
J4. Visitor drags / keyboard-arrows the before/after slider → reveal changes (native range input value exposed to the accessibility tree).
J5. Visitor opens FAQ items (keyboard operable) and nav anchors scroll to sections.
J6. Mobile viewport: nav collapses to menu, no horizontal scroll, form usable.
J7. Reduced-motion and no-backdrop-filter fallbacks render readable solid panels.

## 5. Data model

No database. Typed content modules in `src/content/`: `site.ts` (name, slogan, email, socials),
`services.ts`, `projects.ts` (placeholder case studies), `process.ts`, `pricing.ts`,
`testimonials.ts` (flagged `placeholder: true`), `faq.ts` (also feeds FAQPage JSON-LD).

## 6. API / server contract

| Route          | Method      | Input          | Output         | Errors                                                                                                            |
| -------------- | ----------- | -------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/api/contact` | POST (JSON) | `ContactInput` | `{ ok: true }` | 400 `{ok:false, errors}` validation; 403 Turnstile fail; 429 too fast/rate; 500 `{ok:false, error:"send_failed"}` |

`ContactInput` (Zod, `src/lib/contracts/contact.ts`, orchestrator-owned): `name` (2–80),
`email` (valid), `company` (optional ≤120), `website` (optional URL), `service`
(`redesign` | `new-build` | `care-plan` | `not-sure`), `budget` (optional enum),
`message` (10–2000), `consent` (true), `turnstileToken` (string), honeypot `nickname`
(must be empty), `elapsedMs` (number, ≥ 3000). Worker: `src/worker/` handles `/api/*`,
all other paths fall through to static assets.

### 6b. Payments and proposals (scope added 2026-10-08)

- **Stripe (deposit checkout).** `POST /api/checkout` with `CheckoutInput` (`package`: `launch` | `redesign`,
  optional `email`) returns `{ok:true,url}` of a Stripe-hosted Checkout Session (mode `payment`, USD,
  amount looked up server-side from `DEPOSIT_PACKAGES`, never from the client). Success -> `/thanks`
  (new static page, includes `session_id`), cancel -> `/#pricing`. `POST /api/stripe-webhook` verifies the
  `Stripe-Signature` (Web Crypto HMAC, timestamp tolerance), handles `checkout.session.completed`, and emails the
  owner via Resend. The Care & Growth plan has no checkout (CTA goes to `#contact`). Shared schema:
  `src/lib/contracts/checkout.ts`. No Stripe SDK; plain `fetch` to the REST API (pin an API version header).
- **PandaDoc (proposal on lead).** After a successful contact submission (owner email sent first), if PandaDoc is
  configured the Worker creates a document from `PANDADOC_TEMPLATE_ID` for the lead (recipient = lead email,
  tokens from form fields), and sends it when `PANDADOC_AUTO_SEND=true`, else leaves it as a draft for the owner.
  PandaDoc failure never fails the lead (logged; owner email still delivered). Runs via `ctx.waitUntil`.
- Both integrations are optional and degrade to demo mode when keys are unset. Test mode / sandbox first.

## 7. Auth & permissions

None. Public site; no sessions.

## 8. Integrations & env vars

| Service                                                                                                                                                                                                                                                                                             | Purpose                                  | Vars                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| Resend                                                                                                                                                                                                                                                                                              | Email lead to owner (reply-to = visitor) | `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` |
| Turnstile                                                                                                                                                                                                                                                                                           | Bot check                                | `PUBLIC_TURNSTILE_SITE_KEY`, secret `TURNSTILE_SECRET_KEY` |
| Dev/demo mode: with `ENVIRONMENT=development` (in `.dev.vars` only) the Worker may use Cloudflare's test Turnstile secret, and logs-and-succeeds when Resend/Stripe/PandaDoc keys are missing. In production a missing `TURNSTILE_SECRET_KEY` fails closed. Real keys are filled by the owner only. |

## 9. Design system

**Direction:** taste-skill dials (no reference DESIGN.md) with the user's image + marketu.com
as the visual brief. Dials: variance 7, motion 6, density 3 (airy). Frontend agent loads
`design-taste-frontend`. Image-first is not used (no image-generation tool connected).
**Look:** light frosted glass, soft 3D. Pearl canvas with large blurred colour "aura" blobs;
translucent white cards (1px light border, soft shadow, inner highlight); glossy gradient
hero panels; pill buttons; floating pre-rendered 3D-style objects (glass orb, "core"
sphere, capsule); one dark "Core" gradient section (pricing or CTA) for contrast.
**Palette (name-derived):** Core = deep indigo ink; Vision = amber spark.

| Token                                                                                          | Value                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `--pearl`                                                                                      | `#F5F3EF` canvas                                                   |
| `--ink`                                                                                        | `#0E1024` text                                                     |
| `--core-900/600/400`                                                                           | `#14163F` / `#3B3BD6` / `#7C7CFF`                                  |
| `--vision-500/300`                                                                             | `#FF8A2B` / `#FFC083`                                              |
| `--aura-teal`                                                                                  | `#19B5A5` (accent glow, sparingly)                                 |
| `--glass`                                                                                      | `rgba(255,255,255,.55)` + blur 16px, border `rgba(255,255,255,.7)` |
| Gradients: core→vision on hero panel and primary CTA ring. Verify AA contrast on worst-case    |
| background behind glass.                                                                       |
| **Type:** Bricolage Grotesque (display, preload) + Inter (body). Fluid scale via `clamp`.      |
| **Radius/spacing:** cards 28px, pills 999px, section padding `clamp(5rem, 10vw, 9rem)`.        |
| **Components:** Nav, Button (primary/ghost), GlassCard, SectionHeading, Hero, ServiceCard,     |
| ProjectCard, BeforeAfter, ProcessStep, PricingCard, Testimonial, FaqItem (`<details>`),        |
| ContactForm, Footer, FloatingObject.                                                           |
| **Breakpoints:** 480 / 768 / 1024 / 1280.                                                      |
| **Glass rules (from research):** ≤4–6 `backdrop-filter` elements in view on mobile, blur       |
| 12–20px, never animate blurred elements or the blur radius, literal values plus                |
| `-webkit-backdrop-filter`, fallback tier for `@supports not (backdrop-filter)`,                |
| `prefers-reduced-transparency`, `prefers-reduced-motion`, and Save-Data.                       |
| **Tone of copy:** confident, plain, premium. Slogan "The Core Vision." Hero example: "Websites |
| built around your core vision." CTA: "Book a free consult". Placeholder prices and             |
| testimonials are marked in code and never put in JSON-LD ratings.                              |

## 10. Non-functional

- Budgets: mobile Lighthouse Perf ≥95, A11y/SEO/Best-Practices ≥95; LCP <2.0 s, CLS <0.05,
  JS shipped on first load <60 KB gz excluding lazy GSAP.
- SEO: title/meta/OG/Twitter, OG image, canonical, sitemap, robots, JSON-LD, favicon set.
- A11y: WCAG 2.2 AA, skip link, focus rings, keyboard slider, `prefers-reduced-motion`.
- Security: `_headers` (CSP, HSTS, nosniff, referrer-policy), Zod on server, Turnstile,
  no secrets in client. Privacy note + consent checkbox. No analytics at launch.

## 11. Work breakdown & file ownership

Shared (orchestrator, read-only for agents): `src/lib/contracts/**`, `src/lib/env.ts`,
`astro.config.*`, `wrangler.jsonc`, `package.json`, `.env.example`, configs, `docs/**`.

| Task                                                                                                              | Owner             | Files/dirs                                                                                                              | Depends on |
| ----------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| Scaffold, tooling, contracts, launch.json                                                                         | orchestrator      | root configs, contracts                                                                                                 | approval   |
| Design system, layout, all sections, content, slider, motion, SEO, assets, privacy/404 pages, component e2e-hooks | frontend-engineer | `src/components/**`, `src/layouts/**`, `src/pages/**`, `src/content/**`, `src/styles/**`, `src/scripts/**`, `public/**` | scaffold   |
| Contact Worker: handler, Turnstile + Resend clients, rate/min-time checks, unit tests                             | backend-engineer  | `src/worker/**`, `tests/unit/worker/**`                                                                                 | contract   |
| Wire ContactForm to `/api/contact` (client fetch + states)                                                        | frontend-engineer | `src/components/ContactForm.astro`, `src/scripts/contact.ts`                                                            | contract   |
| QA e2e/a11y/responsive/Lighthouse                                                                                 | qa-tester         | `tests/e2e/**`                                                                                                          | build      |
| Review                                                                                                            | code-reviewer     | read-only                                                                                                               | QA         |
| Single build wave (two agents in parallel): frontend + backend. No vertical slices needed.                        |

## 12. Out of scope / later

CMS, blog, real calendar embed, analytics, WebGL hero, i18n, real domain/email sending
(needs the owner's domain + Resend verification), deploy.

## 13. Changelog

- 2026-10-07: draft created from brief + research.
- 2026-10-08: added Stripe deposit checkout + PandaDoc proposal (�6b, �8); new `/thanks` page; Turnstile secret must fail closed outside dev.
