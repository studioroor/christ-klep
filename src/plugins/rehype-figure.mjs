/**
 * Markdown conventions for images, chosen so they can be written from Decap CMS:
 *
 *   ![alt](/uploads/x.jpg "Caption")  -> <figure><img><figcaption>Caption</figcaption></figure>
 *   ![alt](/uploads/x.jpg#right)      -> image floated right of the text (#left works too)
 *   ![alt](/uploads/x.jpg#small)      -> image shown small (#medium works too)
 */
export default function rehypeFigure() {
  return (tree) => {
    walk(tree, (node) => node.tagName === "img" && prepareImage(node));
    walk(tree, (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => toFigure(child) ?? child);
    });
  };
}

function walk(node, fn) {
  fn(node);
  for (const child of node.children ?? []) walk(child, fn);
}

function prepareImage(img) {
  const [src, hint] = String(img.properties.src ?? "").split("#");
  img.properties.src = src;
  if (hint === "left" || hint === "right") img.properties.className = [`align-${hint}`];
  if (hint === "small" || hint === "medium") img.properties.className = [`size-${hint}`];
  img.properties.loading = "lazy";
  img.properties.decoding = "async";
}

/** A paragraph holding nothing but a captioned image becomes a <figure>. */
function toFigure(node) {
  if (node.type !== "element" || node.tagName !== "p") return;
  const content = node.children.filter((c) => !(c.type === "text" && !c.value.trim()));
  const img = content[0];
  if (content.length !== 1 || img.tagName !== "img" || !img.properties.title) return;

  const caption = String(img.properties.title);
  delete img.properties.title;
  const className = img.properties.className;
  delete img.properties.className;
  return {
    type: "element",
    tagName: "figure",
    properties: { className },
    children: [img, { type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: caption }] }],
  };
}
