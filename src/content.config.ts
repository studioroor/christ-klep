import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    // Pages without a menu title are published but left out of the navigation.
    // The CMSes may save an emptied field as null, so treat null as missing.
    menuTitle: z.string().nullish().transform((v) => v ?? undefined),
    order: z.number().nullish().transform((v) => v ?? 99),
    description: z.string().nullish().transform((v) => v ?? undefined),
  }),
});

export const collections = { pages };
