import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    // Pages without a menu title are published but left out of the navigation.
    menuTitle: z.string().optional(),
    order: z.number().default(99),
    description: z.string().optional(),
  }),
});

export const collections = { pages };
