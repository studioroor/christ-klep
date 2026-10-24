/**
 * One-off import of the WordPress site at christklep.nl into Markdown.
 *
 * Fetches every page via the WordPress REST API, converts the HTML to
 * Markdown (src/content/pages/*.md) and downloads all referenced images
 * into public/uploads/. Re-running it overwrites the generated files.
 *
 *   bun run scripts/migrate-from-wordpress.ts
 *
 * Markdown conventions the site understands (see src/plugins/rehype-figure.mjs):
 *   ![alt](/uploads/x.jpg "Caption")   -> <figure> with <figcaption>
 *   ![alt](/uploads/x.jpg#right)       -> image floated right (also #left)
 *   ![alt](/uploads/x.jpg#small)       -> image shown small (also #medium)
 */
import TurndownService from "turndown";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const SITE = "https://christklep.nl";
const ROOT = join(import.meta.dir, "..");
const PAGES_DIR = join(ROOT, "src/content/pages");
const PUBLIC_DIR = join(ROOT, "public");
const MAX_IMAGE_SIZE = 1600;
const MAX_PNG_BYTES = 300_000;

// Menu order and labels as configured in the WordPress "Default menu".
const PAGES: Record<string, { file: string; order: number; menuTitle: string; description?: string }> = {
  "christ-klep-militair-historicus": {
    file: "index",
    order: 1,
    menuTitle: "Welkom op de website van Christ Klep",
    description:
      "Welkom op de website van Christ Klep (1959), militair-historicus en allround liefhebber van geschiedenis en internationale betrekkingen.",
  },
  "over-christ-klep": {
    file: "over-christ-klep",
    order: 2,
    menuTitle: "Over Christ Klep",
    description:
      "Christ Klep behaalde de onderwijsgraden Geschiedenis en Engels op de Nieuwe Lerarenopleiding en volgde een studie Geschiedenis aan de Universiteit Utrecht.",
  },
  "lezingen-en-dagvoorzitterschappen": { file: "lezingen-en-dagvoorzitterschappen", order: 3, menuTitle: "Lezingen" },
  boekpublicaties: {
    file: "boekpublicaties",
    order: 4,
    menuTitle: "Boekpublicaties",
    description:
      "Christ Klep schreef, alleen en met anderen, door de jaren heen meerdere boeken over militaire geschiedenis, vredesmissies, defensie en politiek.",
  },
  "christ-klep-in-de-media": {
    file: "christ-klep-in-de-media",
    order: 5,
    menuTitle: "Christ Klep in de media",
    description:
      "Christ Klep becommentarieert regelmatig actuele zaken, defensieonderwerpen en wat hem nader aan het hart ligt in uiteenlopende media.",
  },
  "christ-klep-als-cartoonist": { file: "christ-klep-als-cartoonist", order: 6, menuTitle: "Christ Klep als cartoonist" },
  contact: { file: "contact", order: 7, menuTitle: "Contact" },
};

// Images hotlinked from other sites are copied locally so they can't break.
const EXTERNAL_IMAGES: Record<string, string> = {
  "s3-eu-west-1.amazonaws.com": "extern/de-eerste-tiktok-oorlog.jpg",
  "nos.nl": "extern/nos-srebrenica.jpg",
  "images0.persgroep.net": "extern/trouw-bevrijdingsjournaal.jpg",
};

// Hotlinks that died on the live site, replaced by the same image from the uploads.
const REPLACED_IMAGES: Record<string, string> = {
  "www.paagman.nl/autoimg/75387725": "2022/01/9789462498655_front.jpg",
};

// "Images" in WordPress that are actually web pages and never rendered.
const BROKEN_IMAGES = ["www.google.nl/search", "www.boekenbestellen.nl/boek/de-eerste-tiktok-oorlog/61565"];

const downloads = new Map<string, string>();

/** Maps a WordPress or external image URL to a local /uploads path, or null to drop it. */
function localImage(src: string): string | null {
  if (BROKEN_IMAGES.some((b) => src.includes(b))) return null;
  const replaced = Object.entries(REPLACED_IMAGES).find(([b]) => src.includes(b));
  if (replaced) src = `${SITE}/wp-content/uploads/${replaced[1]}`;
  const upload = src.match(/wp-content\/uploads\/(.+?)(?:[?#].*)?$/);
  if (upload) {
    // Prefer the original over WordPress' resized "-300x225" variants.
    const path = upload[1].replace(/-\d+x\d+(\.\w+)$/, "$1");
    downloads.set(`${SITE}/wp-content/uploads/${path}`, path);
    return `/uploads/${path}`;
  }
  const host = new URL(src).host;
  const path = EXTERNAL_IMAGES[host];
  if (!path) throw new Error(`Unknown external image: ${src}`);
  downloads.set(src, path);
  return `/uploads/${path}`;
}

function localHref(href: string): string {
  if (/wp-content\/uploads\//.test(href)) return localImage(href) ?? href;
  return href.replace(/^https?:\/\/(www\.)?christklep\.nl\//, "/");
}

function imageMarkdown(img: HTMLImageElement, caption = "", alignClass = ""): string {
  const src = localImage(img.getAttribute("src") ?? "");
  if (!src) return "";
  const cls = `${img.getAttribute("class") ?? ""} ${alignClass}`;
  // WordPress stored a display width per image; keep that as a rough size hint.
  const width = Number(img.getAttribute("width") ?? 0);
  const size = width && width < 300 ? "#small" : width && width < 450 ? "#medium" : "";
  const align = /alignright/.test(cls) ? "#right" : /alignleft/.test(cls) ? "#left" : size;
  const alt = (img.getAttribute("alt") ?? "").replace(/[\[\]]/g, "");
  const title = caption ? ` "${caption.replace(/"/g, "'")}"` : "";
  return `![${alt}](${src}${align}${title})`;
}

const td = new TurndownService({ headingStyle: "atx", hr: "---", bulletListMarker: "-", emDelimiter: "*" });

td.remove(["script", "style", "wbr"]);

td.addRule("figure", {
  filter: "figure",
  replacement(_content, node) {
    const fig = node as HTMLElement;
    const img = fig.querySelector("img");
    const caption = fig.querySelector("figcaption");
    if (!img) return "";
    const align = fig.getAttribute("class") ?? "";
    if (!caption || !caption.textContent?.trim()) return `\n\n${imageMarkdown(img, "", align)}\n\n`;
    // Long or linked captions (book blurbs) read better as regular paragraphs.
    if (caption.querySelector("a") || (caption.textContent ?? "").length > 250) {
      const html = caption.innerHTML.replace(/<\/?(strong|kbd)>/g, "").replace(/(<br>\s*){2,}/g, "</p><p>");
      return `\n\n${imageMarkdown(img, "", align)}\n\n${td.turndown(`<p>${html}</p>`)}\n\n`;
    }
    for (const br of Array.from(caption.querySelectorAll("br"))) {
      br.parentNode!.replaceChild(fig.ownerDocument.createTextNode(" — "), br);
    }
    const text = (caption.textContent ?? "").replace(/\s+/g, " ").trim();
    return `\n\n${imageMarkdown(img, text, align)}\n\n`;
  },
});

td.addRule("image", {
  filter: "img",
  replacement: (_content, node) => imageMarkdown(node as HTMLImageElement),
});

td.addRule("link", {
  filter: (node) => node.nodeName === "A" && !!node.getAttribute("href"),
  replacement(content, node) {
    const a = node as HTMLAnchorElement;
    // Links that only wrap an image pointed at the full-size file: keep just the image.
    if (a.querySelector("img") && !a.textContent?.trim()) return content;
    if (!content.trim()) return "";
    return `[${content}](${localHref(a.getAttribute("href")!)})`;
  },
});

// WordPress used a heading full of underscores as a visual divider.
td.addRule("underscoreDivider", {
  filter: (node) => /^H[1-6]$/.test(node.nodeName) && /^_+$/.test(node.textContent?.trim() ?? ""),
  replacement: () => "\n\n---\n\n",
});

// Typos in the WordPress content that don't survive conversion well.
const FIXUPS: [string | RegExp, string][] = [
  [/(Haagsch-college\.\w+)\)\s+\(foto Haagsch College 2018\)/, '$1 "Foto Haagsch College 2018")'],
  ["*De oorlog van nu. Een rationele kijk op militair geweld in de 21**e* *eeuw*", "*De oorlog van nu. Een rationele kijk op militair geweld in de 21e eeuw*"],
  ["(h[ttps://www.trouw.nl/", "([https://www.trouw.nl/"],
];

function frontmatter(data: Record<string, string | number | undefined>): string {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`);
  return `---\n${lines.join("\n")}\n---\n`;
}

function decodeEntities(s: string): string {
  return td.turndown(`<p>${s}</p>`).replace(/\\([\[\]*_])/g, "$1");
}

/** Downloads an image and returns its final path (large PNG photos become JPEGs). */
async function download(url: string, path: string): Promise<string> {
  const dest = join(PUBLIC_DIR, "uploads", path);
  const jpgPath = path.replace(/\.png$/i, ".jpg");
  if (existsSync(join(PUBLIC_DIR, "uploads", jpgPath))) return jpgPath;
  if (existsSync(dest)) return path;
  const res = await fetch(url.replace("https:///", "https://"));
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, new Uint8Array(await res.arrayBuffer()));
  // Originals are up to 2560px; shrink them (macOS sips) since public/ isn't optimised at build time.
  if (/\.(jpe?g|png)$/i.test(dest) && spawnSync("which", ["sips"]).status === 0) {
    spawnSync("sips", ["-Z", String(MAX_IMAGE_SIZE), dest], { stdio: "ignore" });
  }
  console.log(`  downloaded ${path}`);
  if (/\.png$/i.test(dest) && statSync(dest).size > MAX_PNG_BYTES && spawnSync("which", ["sips"]).status === 0) {
    spawnSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", dest, "--out", join(PUBLIC_DIR, "uploads", jpgPath)], { stdio: "ignore" });
    unlinkSync(dest);
    console.log(`  converted to ${jpgPath}`);
    return jpgPath;
  }
  return path;
}

const pages = (await (await fetch(`${SITE}/wp-json/wp/v2/pages?per_page=100`)).json()) as any[];
await mkdir(PAGES_DIR, { recursive: true });

const output = new Map<string, string>();
for (const page of pages) {
  const meta = PAGES[page.slug];
  if (!meta) throw new Error(`No mapping for page ${page.slug}`);
  const body = td
    .turndown(page.content.rendered)
    .replace(/ /g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const fixed = FIXUPS.reduce((md, [from, to]) => md.replace(from, to), body);
  const md =
    frontmatter({
      title: decodeEntities(page.title.rendered),
      menuTitle: meta.menuTitle,
      order: meta.order,
      description: meta.description,
    }) + `\n${fixed}\n`;
  output.set(meta.file, md);
}

const renamed = new Map<string, string>();
for (const [url, path] of downloads) {
  const final = await download(url, path);
  if (final !== path) renamed.set(`/uploads/${path}`, `/uploads/${final}`);
}

for (const [file, md] of output) {
  let result = md;
  for (const [from, to] of renamed) result = result.replaceAll(from, to);
  await writeFile(join(PAGES_DIR, `${file}.md`), result);
  console.log(`wrote ${file}.md`);
}
