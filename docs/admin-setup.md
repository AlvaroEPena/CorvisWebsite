# Reviews admin (`/admin`)

A static page (Sveltia CMS) that edits `src/content/reviews.json` through the GitHub API. Every **Save**
is a commit on `main` of `AlvaroEPena/CorvisWebsite`; Cloudflare Workers Builds then rebuilds and
redeploys the site. There is no separate sign-in Worker: the single editor signs in with a GitHub token.

Nothing here is switched on until the owner does the steps below.

## What it edits

One collection, **Reviews**, with one file, **Client reviews**: a sortable list. Per review: name, role,
business name, quote, "Show on the home page", and an optional link to their new site (leave it empty
to show a disabled "View their new site" button). New reviews get a unique id automatically. Drag to
reorder: list order is the order on `/reviews`, and the home page shows the ticked ones in that order
(at most six).

The config lives in `src/admin/config.ts` and `src/admin/reviews-fields.ts`. A unit test round-trips
the real `reviews.json` through those field definitions, so a save produces a clean diff.

## Owner steps

1. **Repo access.** The site code must be in `AlvaroEPena/CorvisWebsite` on branch `main`. To try edits
   away from production, set the build variable `PUBLIC_CMS_BRANCH` (and `PUBLIC_CMS_REPO` for another repo).
2. **Create a fine-grained token** (GitHub > Settings > Developer settings > Personal access tokens >
   Fine-grained tokens > Generate new token):
   - Resource owner: `AlvaroEPena`
   - Repository access: **Only select repositories** > `CorvisWebsite` only
   - Permissions > Repository permissions > **Contents: Read and write** (Metadata: Read-only is added
     automatically). Nothing else.
   - Expiration: pick a date you will remember (for example 90 days) and renew it then.
   - Copy the token once; GitHub never shows it again. Keep it in a password manager.
3. **Sign in.** Open `https://<your site>/admin`, choose **Sign In Using Access Token**, paste the
   token. It is stored in that browser only. Sign out on shared computers.
4. **Edit and Save.** Make a small edit and Save. Confirm a commit appears on `main`, then that
   Cloudflare redeploys. A failed build leaves the previous site live.
5. **Auto-deploy.** Make sure Cloudflare Workers Builds is connected to the repository (production
   branch `main`) so each commit redeploys.

## Notes

- The page is `noindex`, `no-store`, never framed, and has its own Content-Security-Policy
  (`public/_headers`, `/admin*` block). It is excluded from `robots.txt` and must be excluded from the
  sitemap (see the filter in `astro.config.mjs`).
- Anyone with the token can change the reviews, so treat it like a password and revoke it from the same
  GitHub page if it leaks.
- Sveltia CMS sign-in options were checked in the package itself: without `base_url` it shows "Sign In
  Using Access Token" and "Work with Local Repository".
