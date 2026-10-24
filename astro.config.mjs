// @ts-check
import { defineConfig } from "astro/config";
import rehypeBasePath from "./src/plugins/rehype-base-path.mjs";
import rehypeFigure from "./src/plugins/rehype-figure.mjs";

// The GitHub Pages workflow sets SITE and BASE_PATH, e.g. https://studioroor.github.io and
// /christ-klep, until the custom domain is set up.
const site = process.env.SITE || "https://christklep.nl";
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  markdown: {
    rehypePlugins: [rehypeFigure, [rehypeBasePath, { base }]],
  },
});
