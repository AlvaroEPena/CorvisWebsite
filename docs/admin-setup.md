# Reviews admin (`/admin`)

A static page (Sveltia CMS) that edits the review files in `src/content/reviews/` through the GitHub API. Every **Save**
is a commit on `main` of `AlvaroEPena/CorvisWebsite`; Cloudflare Workers Builds then rebuilds and
redeploys the site. There is no separate sign-in Worker: the single editor signs in with a GitHub token.

Nothing here is switched on until the owner does the steps below.

## What it edits

**No duplicates, always in sync.** Each review is ONE small file in `src/content/reviews/` (the file
name is the review's id). "All reviews" and "Home reviews" are two views of those same files, so a
review exists exactly once: anything changed in one editor is the same change in the other, and there is
nothing to keep in step.

- **All reviews**: every review. Edit name, role, business name, quote, the optional link to their new
  site (empty = disabled "View their new site" button), add and delete reviews, and use the two tick
  boxes below. **Reorder** (drag, or the up/down buttons) sets the order on `/reviews`.
- **Home reviews**: only the reviews ticked "Show on the home page". **Reorder** sets their order on the
  home page. You can edit any text here too, add a review (it starts on the home screen), and use
  "Show on the reviews page". Delete is switched off here (deleting removes a review everywhere, so do
  that in All reviews).

Two switches decide where a review appears; they are independent:

| Switch                                         | Where you see it | Effect                                                                          |
| ---------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| Show on the home page (`featured`)             | All reviews only | On the home page, in the Home reviews order                                     |
| Show on the reviews page (`showOnReviewsPage`) | Both editors     | Listed on `/reviews` (and counted in its "N reviews"), in the All reviews order |

A review can be on the home page but hidden from `/reviews`, and the other way round. New reviews start
ticked for the Reviews page.

**Remove from home screen (Home reviews).** Open a review in Home reviews: instead of the tick box it
shows "This review is on the home screen." and a **Remove from home screen** button. Pressing it asks
"Remove <name> from the home screen? It stays in All reviews." Cancel changes nothing. OK marks the
review for removal ("will leave the home screen when you press Save"; **Undo** is available); press
**Save** to make it final. That clears the same "Show on the home page" tick you see in All reviews, so
the two stay in step, and the review leaves the Home reviews list after saving. To put it back, tick
"Show on the home page" in All reviews. Its old home position is remembered in the file and is used
again if it is ticked later (Reorder in Home reviews to change it).

Rules the site follows: the home page shows exactly the ticked reviews, in the Home reviews order; a
review ticked later (no home position yet) goes after the placed ones until you open Reorder in Home
reviews once and press Done; at most six show on the home page (the first six in that order).

How it works: Reorder saves a number in each file (`order` for the Reviews page, `homeOrder` for the
home page). A drag in one editor never changes the other editor's numbers. Saving from a different
editor may move those two keys around inside a file, which is harmless. The Remove button is a small
custom field type (`src/admin/home-membership-widget.ts`); a custom field can only change its own value,
which is why the old `homeOrder` number is left in the file instead of being cleared.

What Sveltia cannot do (checked against 0.227.2): a filtered view cannot hide its own Delete button (it
is shown greyed out), the confirmation is the browser's own dialog (plain, but reliable and accessible), and a list that only contains the ticked reviews cannot be built on its own, so
the Home list comes from the tick in All reviews instead of a second list that could disagree.

The config lives in `src/admin/config.ts` and `src/admin/reviews-fields.ts`. Unit tests round-trip the
real review files through those field definitions (byte for byte for All reviews, value for value for
Home reviews), and `tests/e2e/admin-reviews.spec.ts` drives the real editor against a mocked GitHub (no
network) and checks the commit each Save would make.

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

## Team photos (not part of the editor)

Photos on `/team` and the avatars under the home reviews live in `src/assets/team/`, found by founder
id. Alvaro's are `alvaro-card.jpg` (portrait) and `alvaro-avatar.jpg` (small square), high-quality JPEG masters that the site build turns into AVIF in a single step, made by
`node scripts/make-team-photos.mjs` (reads the original from `TEAM_PHOTO_ALVARO`, default
`C:/Users/Alvaro/Desktop/Alvaro-5.tif`; the original is never copied into the repo).

To add Aaron's photo: run `node scripts/make-team-photos.mjs aaron path/to/his-photo.jpg`. It writes
`src/assets/team/aaron-card.jpg` and `aaron-avatar.jpg`, which replace the designed placeholder
(`aaron-placeholder.svg`) with no other change; the alt text is built from his name and role in
`src/content/site.ts`. Look at `/team` afterwards; if the crop is off, add a crop for `aaron` in the
`CROPS` table at the top of the script and run it again.
