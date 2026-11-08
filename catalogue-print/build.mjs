/**
 * Builds a printable catalogue PDF from data/catalogue.json.
 *
 *   node catalogue-print/build.mjs
 *   node catalogue-print/build.mjs --template=gold-classic --only="Hair Care & Colour"
 *   node catalogue-print/build.mjs --html            # skip the PDF, just write the HTML
 *
 * Layout, grid, fonts and colours come from the template folder
 * (catalogue-print/templates/<name>/), so a new look means a new folder — no
 * changes to this file.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { render, renderPlain, escapeHtml } from "./render.mjs";
import { findChrome } from "./chrome.mjs";

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));

/* ─────────────────────────────────────────────────────────── arguments ──── */
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  }),
);

const config = JSON.parse(readFileSync(path.join(here, "config.json"), "utf8"));
const templateName = args.template || config.template;
const templateDir = path.join(here, "templates", templateName);
if (!existsSync(templateDir)) {
  console.error(`Template "${templateName}" not found in ${path.join(here, "templates")}`);
  process.exit(1);
}

const template = JSON.parse(readFileSync(path.join(templateDir, "template.json"), "utf8"));
const read = (file) => readFileSync(path.join(templateDir, file), "utf8");

/* ──────────────────────────────────────────────────────────── the data ──── */
// --source lets a caller (the admin UI) build from a snapshot of live data
// rather than the checked-in file.
const sourceFile = args.source ? path.resolve(String(args.source)) : path.resolve(here, config.source);
const data = JSON.parse(readFileSync(sourceFile, "utf8"));
const categoryById = new Map(data.categories.map((category) => [category.id, category]));

const only = args.only ? [args.only] : config.onlyCategories ?? [];
const skip = config.skipCategories ?? [];
const onlyFeatured = args.featured === true || args.featured === "true" || Boolean(config.onlyFeatured);

let products = data.products.filter((product) => {
  const category = categoryById.get(product.category_id);
  const name = category?.name ?? "";
  if (only.length && !only.includes(name)) return false;
  if (skip.includes(name)) return false;
  if (onlyFeatured && !product.featured) return false;
  return true;
});

// Always grouped by category, in the admin's category order; within a
// category by the product's own sort order, then name.
const order = "category";
if (args.order && args.order !== order) {
  console.warn(`! --order=${args.order} ignored: the catalogue is always printed by category.`);
}
products.sort((a, b) => {
  const left = categoryById.get(a.category_id);
  const right = categoryById.get(b.category_id);
  return (
    (left?.sort_order ?? 99) - (right?.sort_order ?? 99) ||
    (left?.name ?? "").localeCompare(right?.name ?? "") ||
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    a.name.localeCompare(b.name)
  );
});

if (products.length === 0) {
  console.error("No products matched the filters in config.json.");
  process.exit(1);
}

/* ─────────────────────────────────────────────────────────── the pages ──── */
const perPage = template.grid.columns * template.grid.rows;
const pages = [];

// A template can ask for every category to start on a fresh page.
const categoryPageBreak = template.categoryPageBreak ?? config.categoryPageBreak;
if (categoryPageBreak && order === "category") {
  const groups = new Map();
  for (const product of products) {
    const key = product.category_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  }
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += perPage) pages.push(group.slice(i, i + perPage));
  }
} else {
  for (let i = 0; i < products.length; i += perPage) pages.push(products.slice(i, i + perPage));
}

/* ───────────────────────────────────────────────────────────── render ──── */
// A template may borrow another template's ornaments with "assetsFrom".
const assetsDir = template.assetsFrom
  ? path.join(here, "templates", template.assetsFrom, "assets")
  : path.join(templateDir, "assets");
const assetsUrl = pathToFileURL(assetsDir).href;
const imageRoot = path.resolve(here, config.imageRoot);
const cardTemplate = read("card.html");
const pageTemplate = read("page.html");

function imageUrl(product) {
  if (!product.image_url) return "";
  if (/^https?:\/\//.test(product.image_url)) return product.image_url;
  const file = path.join(imageRoot, product.image_url.replace(/^\//, ""));
  if (!existsSync(file)) {
    console.warn(`! missing image for "${product.name}": ${product.image_url}`);
    return "";
  }
  return pathToFileURL(file).href;
}

function sizeList(product) {
  if (!product.pack_size) return [];
  return product.pack_size.split(/\s*[·,|]\s*/).map((size) => size.trim()).filter(Boolean);
}

/** Long names step down a size rather than overflowing the title area. */
const titleLengths = template.card.titleLengths ?? { long: 22, xlong: 34 };
function nameClass(name) {
  if (name.length > titleLengths.xlong) return "card-title--xlong";
  if (name.length > titleLengths.long) return "card-title--long";
  return "";
}

const flourishes = template.flourishes ?? {};
const hasCover = template.cover?.enabled !== false;
const pageCount = pages.length + (hasCover ? 1 : 0);
let missingImages = 0;

// Position of each product in the whole catalogue, for templates that number them.
const numberOf = new Map(pages.flat().map((product, position) => [product, position + 1]));

const renderedPages = pages.map((pageProducts, index) => {
  const cards = pageProducts
    .map((product) => {
      const sizes = sizeList(product);
      const src = imageUrl(product);
      if (!src) missingImages += 1;
      return render(cardTemplate, {
        assets: assetsUrl,
        index: pageProducts.indexOf(product),
        even: pageProducts.indexOf(product) % 2 === 1,
        number: String(numberOf.get(product)).padStart(3, "0"),
        name: product.name,
        nameClass: nameClass(product.name),
        brand: product.brand ?? "",
        // Cards carry only the photograph, the name and the pack sizes.
        hasBrand: false,
        description: product.description ?? "",
        hasDescription: false,
        sizesHtml: sizes.map((size) => `<span>${escapeHtml(size)}</span>`).join(""),
        hasSizes: sizes.length > 0,
        imageSrc: src,
        hasImage: Boolean(src),
        category: categoryById.get(product.category_id)?.name ?? "",
      });
    })
    .join("\n");

  const pageNumber = index + (hasCover ? 2 : 1);
  const names = [];
  for (const product of pageProducts) {
    const name = categoryById.get(product.category_id)?.name;
    if (name && !names.includes(name)) names.push(name);
  }

  return render(pageTemplate, {
    assets: assetsUrl,
    cards,
    pageCategory: names[0] ?? "",
    pageCategories: names.join(" · "),
    hasPageCategory: names.length > 0,
    pageNumber,
    totalPages: pageCount,
    businessName: config.cover?.businessName ?? "",
    showFooter: template.footer?.show !== false,
    footer: renderPlain(template.footer?.format ?? "Page {{pageNumber}}", {
      pageNumber,
      totalPages: pageCount,
      businessName: config.cover?.businessName ?? "",
      pageCategory: names[0] ?? "",
      pageCategories: names.join(" · "),
    }),
    flourishTopLeft: flourishes.topLeft !== false,
    flourishBottomRight: flourishes.bottomRight !== false,
  });
});

// A template may put a picture on its cover: "cover": { "image": "images/x.jpeg" },
// a path inside public/ like a product photograph.
const coverImageFile = template.cover?.image
  ? path.join(imageRoot, template.cover.image.replace(/^\//, ""))
  : null;
if (coverImageFile && !existsSync(coverImageFile)) {
  console.warn(`! cover image not found: ${template.cover.image}`);
}
const coverImage = coverImageFile && existsSync(coverImageFile) ? pathToFileURL(coverImageFile).href : "";

const coverHtml =
  template.cover?.enabled === false
    ? ""
    : render(read("cover.html"), {
        assets: assetsUrl,
        ...config.cover,
        coverImage,
        hasCoverImage: Boolean(coverImage),
        showBlessing:
          template.cover?.showBlessing !== false &&
          existsSync(path.join(assetsDir, "cover-blessing.png")),
        flourishTopLeft: flourishes.topLeft !== false,
        flourishBottomRight: flourishes.bottomRight !== false,
      });

/** template.json values become CSS variables, so theme.css stays declarative. */
const cssVariables = `
  :root {
    --page-width: ${template.page.width}pt;
    --page-height: ${template.page.height}pt;
    --margin-top: ${template.page.margin.top}pt;
    --margin-right: ${template.page.margin.right}pt;
    --margin-bottom: ${template.page.margin.bottom}pt;
    --margin-left: ${template.page.margin.left}pt;
    --columns: ${template.grid.columns};
    --rows: ${template.grid.rows};
    --column-gap: ${template.grid.columnGap}pt;
    --row-gap: ${template.grid.rowGap}pt;
    --title-height: ${template.card.titleHeight}pt;
    --image-padding: ${template.card.imagePadding ?? 8}pt;
    --font-title: ${template.fonts.title};
    --font-body: ${template.fonts.body};
    --font-cover: ${template.fonts.cover};
    --gold: ${template.colors.gold};
    --gold-soft: ${template.colors.goldSoft};
    --ink: ${template.colors.ink};
    --muted: ${template.colors.muted};
    --flourish-width: ${flourishes.width ?? 130}pt;
  }
`;

const googleFonts = (template.fonts.googleFamilies ?? [])
  .map((family) => `family=${family}`)
  .join("&");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(config.cover?.businessName ?? "Catalogue")}</title>
${googleFonts ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${googleFonts}&display=swap">` : ""}
<style>${cssVariables}</style>
<style>${read("theme.css")}</style>
</head>
<body>
${coverHtml}
${renderedPages.join("\n")}
</body>
</html>
`;

/* ─────────────────────────────────────────────────────────────── output ─── */
const outDir = path.resolve(here, config.output.dir);
mkdirSync(outDir, { recursive: true });

// --out names the file; otherwise every template would overwrite the last one
// when config.output.suffixTemplate is on.
// --out is a file name, never a path: the admin UI passes user input here.
const baseName =
  (typeof args.out === "string" &&
    path
      .basename(args.out)
      .replace(/\.(pdf|html)$/i, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .slice(0, 80)) ||
  (config.output.suffixTemplate === false
    ? config.output.fileName
    : `${config.output.fileName}-${templateName}`);
console.log(`Template : ${template.name} (${templateName})`);
console.log(`Products : ${products.length}`);
console.log(`Pages    : ${pageCount} (${perPage} products per page)`);
if (missingImages) console.log(`Warning  : ${missingImages} product(s) have no image`);

if (args.html) {
  // Preview mode: the HTML is the output.
  const htmlFile = path.join(outDir, `${baseName}.html`);
  writeFileSync(htmlFile, html);
  console.log(`HTML     : ${path.relative(process.cwd(), htmlFile)}`);
  console.log("\n--html given, stopping before the PDF. Open the file in a browser to preview.");
  process.exit(0);
}

// Only the PDF is kept. Chrome prints from a file, so the HTML goes to a
// temporary folder and is deleted afterwards — every asset in it is an
// absolute file:// URL, so it does not need to sit next to anything.
const pdfFile = path.join(outDir, `${baseName}.pdf`);
const chrome = findChrome();
const workDir = mkdtempSync(path.join(os.tmpdir(), "catalogue-html-"));
const htmlFile = path.join(workDir, `${baseName}.html`);
writeFileSync(htmlFile, html);

try {
  await run(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=30000",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfFile}`,
    pathToFileURL(htmlFile).href,
  ], { maxBuffer: 1024 * 1024 * 64 });
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

const size = statSync(pdfFile).size;
console.log(`PDF      : ${path.relative(process.cwd(), pdfFile)} (${(size / 1024 / 1024).toFixed(1)} MB)`);

// A machine-readable last line, for callers that spawn this script.
if (args.json) {
  console.log(
    `__RESULT__${JSON.stringify({
      template: templateName,
      templateLabel: template.name,
      products: products.length,
      pages: pageCount,
      bytes: size,
      pdf: path.basename(pdfFile),
    })}`,
  );
}
