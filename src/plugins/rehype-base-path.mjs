/**
 * Prefixes root-relative links and images in Markdown (/uploads/x.jpg, /contact/) with the
 * base path, so content written by the CMS keeps working when the site lives in a subfolder.
 */
export default function rehypeBasePath({ base = "/" } = {}) {
  const prefix = base.replace(/\/$/, "");
  return (tree) => {
    if (!prefix) return;
    walk(tree, (node) => {
      for (const attr of ["href", "src"]) {
        const value = node.properties?.[attr];
        if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
          node.properties[attr] = prefix + value;
        }
      }
    });
  };
}

function walk(node, fn) {
  fn(node);
  for (const child of node.children ?? []) walk(child, fn);
}
