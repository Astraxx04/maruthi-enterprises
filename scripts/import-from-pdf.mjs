/**
 * Rebuilds the catalogue from the printed PDF catalogue.
 *
 *   node scripts/import-from-pdf.mjs "/path/to/Maruthi Enterprises Catalogue.pdf"
 *
 * Reads every product card (two columns × three rows per page), crops the
 * product photograph straight out of the PDF at high resolution, and merges it
 * with the names, brands, categories and descriptions in
 * scripts/catalogue-map.json. Writes:
 *
 *   public/products/<slug>.jpg   product photographs
 *   data/catalogue.json          categories + products
 */
import * as mupdf from "mupdf";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Atomic write: a temporary file in the same directory, then rename. */
function writeCatalogue(target, value) {
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, value);
  renameSync(temporary, target);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/import-from-pdf.mjs "<catalogue.pdf>"');
  process.exit(1);
}

const map = JSON.parse(readFileSync(path.join(root, "scripts/catalogue-map.json"), "utf8"));

/** Cards whose photograph should appear on the homepage. */
const FEATURED = new Set([
  "p02-r0c1", "p03-r0c0", "p05-r0c1", "p07-r0c0",
  "p08-r0c1", "p11-r0c0", "p14-r0c1", "p21-r1c1",
]);

const SIZE_RE = /^(?:\d+(?:\.\d+)?\s*(?:ml|g|gm|kg|ltr|lt|l|mg|cm|n|'s|s|pcs)\b|\d+\s*\/\s*-|\d+'s)$/i;
const SCALE = 4;        // ≈ 288 dpi — sharp on retina screens
const JPEG_QUALITY = 82;

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const doc = mupdf.Document.openDocument(readFileSync(src), "application/pdf");

// A later edition of the catalogue can drop a photograph that an earlier one
// had. --fallback-pdf points at the older file so those cards keep their
// picture, and the import stays reproducible from the PDFs alone.
const fallbackPath = process.argv.find((arg) => arg.startsWith("--fallback-pdf="))?.slice(15);
const fallbackDoc = fallbackPath
  ? mupdf.Document.openDocument(readFileSync(fallbackPath), "application/pdf")
  : null;

/** The biggest image block in one cell of a page, or null. */
function imageInCell(document, pageIndex, cellKey) {
  if (!document || pageIndex >= document.countPages()) return null;
  const page = document.loadPage(pageIndex);
  const json = JSON.parse(page.toStructuredText("preserve-images").asJSON());
  const bounds = page.getBounds();
  const midX = (bounds[0] + bounds[2]) / 2;
  let best = null;
  for (const block of json.blocks ?? []) {
    if (block.type !== "image") continue;
    const bb = block.bbox;
    if (bb.w < 25 || bb.h < 25) continue;
    const cx = bb.x + bb.w / 2;
    const cy = bb.y + bb.h / 2;
    const key = `${cy < 290 ? 0 : cy < 555 ? 1 : 2}${cx < midX ? 0 : 1}`;
    if (key !== cellKey) continue;
    if (!best || bb.w * bb.h > best.w * best.h) best = bb;
  }
  return best ? { page, bbox: best } : null;
}

/** Renders one image region to a JPEG on disk. */
function cropTo(page, bb, file) {
  const rect = [
    Math.round(bb.x * SCALE),
    Math.round(bb.y * SCALE),
    Math.round((bb.x + bb.w) * SCALE),
    Math.round((bb.y + bb.h) * SCALE),
  ];
  const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, rect, false);
  pixmap.clear(255);
  const device = new mupdf.DrawDevice(mupdf.Matrix.scale(SCALE, SCALE), pixmap);
  page.run(device, mupdf.Matrix.identity);
  device.close();
  writeFileSync(file, pixmap.asJPEG(JPEG_QUALITY));
}
const imagesDir = path.join(root, "public/products");
mkdirSync(imagesDir, { recursive: true });

// Categories keep a stable id derived from the name.
const categories = map.categories.map((category, index) => ({
  id: `cat-${slugify(category.name)}`,
  name: category.name,
  slug: slugify(category.name),
  description: category.description,
  sort_order: index + 1,
}));
const categoryByName = new Map(categories.map((category) => [category.name, category]));

// Photographs already in the catalogue, so a card that lost its picture in a
// newer PDF keeps the one it had.
const previous = new Map(
  (JSON.parse(readFileSync(path.join(root, "data/catalogue.json"), "utf8")).products ?? []).map(
    (product) => [product.slug, product],
  ),
);

const products = [];
const takenSlugs = new Set();
let keptImages = 0;
let fallbackImages = 0;
let blankImages = 0;
const seenKeys = new Set();
const perCategory = new Map();

// Page 1 is the cover; the last page repeats the previous one without images.
for (let pageIndex = 1; pageIndex < doc.countPages() - 1; pageIndex++) {
  const page = doc.loadPage(pageIndex);
  const json = JSON.parse(page.toStructuredText("preserve-whitespace,preserve-images").asJSON());
  const bounds = page.getBounds();
  const midX = (bounds[0] + bounds[2]) / 2;
  const cellOf = (cx, cy) => `${cy < 290 ? 0 : cy < 555 ? 1 : 2}${cx < midX ? 0 : 1}`;

  const biggestImage = new Map();
  const textByCell = new Map();

  for (const block of json.blocks ?? []) {
    const bb = block.bbox;
    if (block.type === "image") {
      if (bb.w < 25 || bb.h < 25) continue; // decorative border art
      const key = cellOf(bb.x + bb.w / 2, bb.y + bb.h / 2);
      const current = biggestImage.get(key);
      if (!current || bb.w * bb.h > current.w * current.h) biggestImage.set(key, bb);
      continue;
    }
    for (const line of block.lines ?? []) {
      const text = line.text.trim();
      if (!text || /^Page \d+$/.test(text)) continue;
      const key = cellOf(line.bbox.x + line.bbox.w / 2, line.bbox.y);
      if (!textByCell.has(key)) textByCell.set(key, []);
      textByCell.get(key).push({ text, bbox: line.bbox });
    }
  }

  for (const cellKey of ["00", "01", "10", "11", "20", "21"]) {
    const bb = biggestImage.get(cellKey);
    const key = `p${String(pageIndex + 1).padStart(2, "0")}-r${cellKey[0]}c${cellKey[1]}`;
    const meta = map.products[key];
    if (!meta) {
      console.warn(`! no mapping for ${key} — skipped`);
      continue;
    }
    seenKeys.add(key);

    // Pack sizes printed beside the photograph (each label is drawn three times).
    const lines = textByCell.get(cellKey) ?? [];
    const unique = [];
    for (const line of lines) if (!unique.includes(line.text)) unique.push(line.text);
    const sizes = meta.sizes ?? unique.filter((text) => SIZE_RE.test(text));

    let slug = slugify(meta.name);
    let suffix = 2;
    while (takenSlugs.has(slug)) slug = `${slugify(meta.name)}-${suffix++}`;
    takenSlugs.add(slug);

    let imageUrl = null;

    if (bb) {
      // A few photographs overlap the size labels printed beside them. Trim the
      // crop so no stray text is baked into the product image.
      let right = bb.x + bb.w;
      let top = bb.y;
      for (const line of lines) {
        const lb = line.bbox;
        const overlaps = lb.x < right && lb.x + lb.w > bb.x && lb.y < bb.y + bb.h && lb.y + lb.h > top;
        if (!overlaps) continue;
        if (lb.x >= bb.x + bb.w * 0.55) right = Math.min(right, lb.x - 2);
        else if (lb.y + lb.h <= bb.y + bb.h * 0.3) top = Math.max(top, lb.y + lb.h + 2);
      }

      const rect = [
        Math.round(bb.x * SCALE),
        Math.round(top * SCALE),
        Math.round(right * SCALE),
        Math.round((bb.y + bb.h) * SCALE),
      ];
      const pixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, rect, false);
      pixmap.clear(255);
      const device = new mupdf.DrawDevice(mupdf.Matrix.scale(SCALE, SCALE), pixmap);
      page.run(device, mupdf.Matrix.identity);
      device.close();
      writeFileSync(path.join(imagesDir, `${slug}.jpg`), pixmap.asJPEG(JPEG_QUALITY));
      imageUrl = `/products/${slug}.jpg`;
    } else {
      // The card has no photograph in this edition. Try the older edition
      // first, then whatever the catalogue already had.
      const older = imageInCell(fallbackDoc, pageIndex, cellKey);
      if (older) {
        cropTo(older.page, older.bbox, path.join(imagesDir, `${slug}.jpg`));
        imageUrl = `/products/${slug}.jpg`;
        fallbackImages += 1;
      }

      const kept = !imageUrl ? previous.get(slug) : null;
      const keptFile = kept?.image_url
        ? path.join(root, "public", kept.image_url.replace(/^\//, ""))
        : null;
      if (!imageUrl && keptFile && existsSync(keptFile)) {
        imageUrl = kept.image_url;
        keptImages += 1;
      } else if (!imageUrl) {
        console.warn(`! no photograph for "${meta.name}" (${key})`);
        blankImages += 1;
      }
    }

    const category = categoryByName.get(meta.category);
    if (!category) throw new Error(`Unknown category "${meta.category}" for ${key}`);
    const order = (perCategory.get(category.id) ?? 0) + 1;
    perCategory.set(category.id, order);

    products.push({
      id: slug,
      name: meta.name,
      slug,
      brand: meta.brand ?? null,
      category_id: category.id,
      description: meta.description ?? null,
      unit: null,
      pack_size: sizes.length ? sizes.join(" · ") : null,
      image_url: imageUrl,
      featured: FEATURED.has(key),
      sort_order: order,
    });
  }
}

const missing = Object.keys(map.products).filter((key) => !seenKeys.has(key));
if (missing.length) console.warn(`! mapped but not found in the PDF: ${missing.join(", ")}`);

// Remove photographs no longer referenced by any product (renamed cards leave
// their old crop behind).
const referenced = new Set(
  products.map((product) => product.image_url && path.basename(product.image_url)).filter(Boolean),
);
let pruned = 0;
for (const file of readdirSync(imagesDir)) {
  if (file.startsWith(".") || referenced.has(file)) continue;
  rmSync(path.join(imagesDir, file));
  pruned += 1;
}

const existing = JSON.parse(readFileSync(path.join(root, "data/catalogue.json"), "utf8"));
writeCatalogue(
  path.join(root, "data/catalogue.json"),
  `${JSON.stringify({ categories, products, enquiries: existing.enquiries ?? [] }, null, 2)}\n`,
);

console.log(`✓ ${categories.length} categories`);
console.log(`✓ ${products.length} products`);
console.log(`✓ ${products.filter((p) => p.image_url).length} photograph(s) in public/products/`);
console.log(`  featured: ${products.filter((p) => p.featured).length}`);
console.log(`  with pack sizes: ${products.filter((p) => p.pack_size).length}`);
if (fallbackImages) console.log(`  took ${fallbackImages} photograph(s) from the fallback PDF`);
if (keptImages) console.log(`  kept existing photograph for ${keptImages} card(s) with none in the PDF`);
if (blankImages) console.log(`  ${blankImages} product(s) have no photograph at all`);
if (pruned) console.log(`  pruned ${pruned} unused image file(s)`);
