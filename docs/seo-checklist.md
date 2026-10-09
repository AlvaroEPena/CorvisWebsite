# Getting found on Google: owner checklist

Plain-language notes for the Corvis owner. Nothing here needs code unless it says so.

## What the site already does (in code)

- **Page titles and descriptions.** The home page is titled "Corvis | Web Design Studio for Local
  Businesses". Every other page has its own title ending in "Corvis" and its own description (70 to 160
  characters). A test checks this on the built site, so a future edit cannot quietly break it.
- **One main heading per page, a language tag, and a canonical address** that points to the page itself,
  so Google never sees two copies of one page.
- **Social preview image** on every public page (what shows when a link is shared).
- **Alt text** on every image (decorative images have an empty one on purpose).
- **Sitemap** at `/sitemap-index.xml` listing every public page, and a `robots.txt` that blocks only the
  admin and the demo copies. The admin, thank-you page and 404 are kept out of search.
- **Structured data** (a machine-readable summary Google reads):
  - `WebSite`: the name "Corvis" plus the alternate names "The Corvis", "Corvis Web Design" and
    "thecorvis", so Google can use the right site name in results.
  - `ProfessionalService`: the business, its founders, services, and logo (`logo-512.png`).
  - `FAQPage`: the questions on the home page.
  - There is deliberately **no review or star-rating markup**: the reviews are not verifiable ratings, and
    wrong markup can get a site penalised.
- **Fast and accessible.** Lighthouse scores for speed, accessibility and SEO are checked before each
  release. Google uses speed as a ranking signal.

## Already done in the search tools

- **Google Search Console:** the domain is verified (by DNS) and the sitemap
  `https://thecorvis.com/sitemap-index.xml` has been submitted.
- **Bing Webmaster Tools:** same, if you have set it up there. Bing can import the Search Console
  setup in one click.

If a tool ever asks for an "HTML tag" instead of DNS: put the value in the build settings as
`PUBLIC_GOOGLE_SITE_VERIFICATION` (Google) or `PUBLIC_BING_SITE_VERIFICATION` (Bing), only the content
value, not the whole tag, then redeploy. Leave them blank otherwise. No code change is needed.

## Asking Google to look at a page

1. Open Search Console and paste the page address in the box at the top.
2. Press **Request indexing** (after the inspection finishes). Do this after a real content change, and
   for new pages. There is a daily limit, so do not repeat it for pages that are already indexed.
3. The **Pages** report shows which pages are indexed and, if not, the reason in plain words.

## What to expect

- **Days to weeks** before a new or renamed page shows up, and often longer before it ranks well.
  Nothing on a website can force it. Check Search Console, not search results, for early signs: it shows
  "Impressions" (how often the site was shown) before anyone clicks.
- **The name Corvis is shared with other businesses**, so a plain search for "corvis" competes with
  them. The realistic first wins are searches that include something only we own:
  - `thecorvis` and `thecorvis.com`
  - `Corvis web design`
  - `Corvis web design studio`
    Searching "web design for [your trade] in [your town]" comes later, and mainly through the Work and
    Reviews pages and the local pages you add.
- Google may show the site name as "Corvis" or "Corvis Web Design" in results. That comes from the
  `WebSite` data above and can take a few weeks to appear.

## Helping Google trust the site (links and profiles)

Google ranks a site partly on who else mentions it. The cheap, honest ways to start:

- **"Website by Corvis" in the footer** of every site we build, linking to `https://thecorvis.com`
  (for example Refined Celebrations and Mod Labs). Real sites linking back is the strongest signal we
  can control.
- **Profiles that name Corvis and link to the site:** a GitHub profile or organisation, LinkedIn pages
  for Alvaro and Aaron, Instagram or TikTok if used. When they exist, add their addresses to `socials`
  in `src/content/site.ts`; they are published automatically as the business's `sameAs` links, which
  tells Google these profiles belong to the same company.
- **A Google Business Profile** for Corvis (best for appearing in local and "near me" results; it needs
  a mailing address or a service area and a verification step).
- **A short case study** on each client's own site or social page mentioning the project and linking back.
- **Keep adding real content:** a new reviewed client, a new project in Work, a new local page. Fresh,
  specific pages are what get matched to searches.

## Where things live

| Thing                                    | File                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Home title, description, alternate names | `src/content/site.ts`                                                                     |
| Structured data                          | `src/layouts/seo.ts`                                                                      |
| Titles and descriptions of other pages   | `src/content/*-copy.ts`, `src/content/team.ts`, the page files                            |
| Verification variables                   | `.env.example`                                                                            |
| Automatic checks                         | `tests/e2e/seo.spec.ts`, `tests/unit/seo.test.ts`, `tests/unit/verification-meta.test.ts` |

## Round 2 (2026-10-09): audit follow-up

Done from the SEO/GEO/AEO audit (the audit tool could not see our JSON-LD; the live site already served WebSite, ProfessionalService with both founders and the four services, and FAQPage):

- **Where we work:** the title and description say "across the US"; a visible definition sentence sits under the hero ("Corvis is a web design studio for local businesses, based on the West Coast and serving businesses across the United States"); the footer and /team name the six cities; `areaServed` is the United States plus those cities (the owner confirmed the cities). No street address is published (remote studio). Edit in `site.coverage` (src/content/site.ts).
- **Service pages:** /services/web-design, /services/local-search, /services/managed-hosting, /services/website-redesign (500+ words each, copy in `src/content/service-pages.ts`, every claim traced to the packages), linked from the home Services cards, the footer and each other; each has Service and BreadcrumbList JSON-LD and is in the sitemap.
- **Schema:** Person (both founders, tied to the business with `worksFor`, no invented profile links) on /team; BreadcrumbList on /team, /sandbox and service pages.
- **Proof:** "A real before and after" is now "See a redesign, before and after" and says it is a sample, not a client. The two live client sites (refinedcelebrations.co, modlabs.store) are linked from Work; the Grit concept is never linked.
- **AI crawlers:** `/llms.txt`, generated from the content modules so prices and services cannot drift.
- **Sitemap:** every URL has a `lastmod` (date of the latest commit).

Deliberately not done: Review/AggregateRating markup (the testimonials are illustrative), HowTo markup (Google dropped HowTo rich results in 2023), a price table with dollar signs (prices are plain numbers by design), alt text on the home page founder avatars (decorative, next to text that names them).

Still to do by the owner: add LinkedIn / Google Business Profile / social links to `site.socials` when they exist (they flow into `sameAs`); in Search Console, resubmit `sitemap-index.xml` and use URL Inspection, then Request indexing, on the four service pages; replace the illustrative reviews with real ones before adding any review markup.
