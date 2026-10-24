# Website for Christ Klep

Static [Astro](https://astro.build) site, editable through [Decap CMS](https://decapcms.org).
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

## Deployment

### Cloudflare Pages

1. Create a Pages project from the GitHub repo: build command `bun run build`, output directory `dist`.
2. Create a GitHub OAuth app with callback URL `https://christklep.nl/api/callback`.
3. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as Pages environment variables.

`functions/api/` handles the CMS login and `public/_redirects` redirects old WordPress URLs.
