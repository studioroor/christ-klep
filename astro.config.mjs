// @ts-check
import { defineConfig } from "astro/config";
import rehypeFigure from "./src/plugins/rehype-figure.mjs";

export default defineConfig({
  site: "https://christklep.nl",
  trailingSlash: "always",
  markdown: {
    rehypePlugins: [rehypeFigure],
  },
});
