# Website for Christ Klep

Static [Astro](https://astro.build) site, editable through [Pages CMS](https://pagescms.org)
(`.pages.yml`) or [Decap CMS](https://decapcms.org) (`public/admin/`).
Content was migrated from the former WordPress site with `scripts/migrate-from-wordpress.ts`.

## Development

```sh
bun install
bun run dev    # site on http://localhost:4321
bun run cms    # local Decap backend, then open http://localhost:4321/admin/index.html
```

With `bun run cms` running, the CMS edits the files in this checkout directly (no login needed).
The colour scheme is in `./colors.md`; the styles are in `src/styles/global.css`.

## Content

- Pages: `src/content/pages/*.md` (`index.md` is the homepage). `menuTitle` and `order` control the menu.
- Images: `public/uploads/`.
- Image conventions in Markdown:
  - `![alt](/uploads/x.jpg "Caption")` renders a captioned figure
  - `![alt](/uploads/x.jpg#right)` floats the image right of the text (`#left` for left)
  - `![alt](/uploads/x.jpg#small)` shows it small (`#medium` for medium)

## Editing with Pages CMS

1. Sign in at [app.pagescms.org](https://app.pagescms.org) with GitHub and install the Pages CMS
   GitHub App on this repository only.
2. Open the repository there; Pages CMS reads `.pages.yml` from the selected branch.
3. Invite editors by email under the repository's collaborators. They log in with a link in
   their mailbox and need no GitHub account.

Every save is a commit on `main`, which triggers a new deployment.

## Deployment

### Cloudflare Pages (recommended)

1. Create a Pages project from the GitHub repo: build command `bun run build`, output directory `dist`.
2. Create a GitHub OAuth app with callback URL `https://christklep.nl/api/callback`.
3. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Pages environment variables.

`functions/api/` handles the CMS login and `public/_redirects` redirects old WordPress URLs.

### GitHub Pages

`.github/workflows/deploy-github-pages.yml` deploys on every push to `main`. Enable Pages with source
"GitHub Actions" in the repository settings. The workflow builds for the URL Pages reports, so the
site works under `studioroor.github.io/christ-klep/` and moves to the root once the custom domain
`christklep.nl` is set. Content keeps root-relative paths (`/uploads/...`); the build adds the prefix.
GitHub Pages can't run the login functions or `_redirects`, so the CMS then needs an external
OAuth proxy (for example a Cloudflare Worker running `functions/api/`).
