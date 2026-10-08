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
