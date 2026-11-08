/**
 * Checks data/catalogue.json against the two sources it is built from, so a
 * silently lost product or a missing photograph is caught before it ships.
 *
 *   node scripts/verify-catalogue.mjs
 *
 * Expected contents: every card in scripts/catalogue-map.json (the printed
 * catalogue) plus every named image in images/manifest.json.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));

const data = read("data/catalogue.json");
const map = read("scripts/catalogue-map.json");
const manifest = existsSync(path.join(root, "images/manifest.json"))
  ? read("images/manifest.json")
  : {};

const problems = [];
const names = new Set(data.products.map((product) => product.name));

/* Everything the printed catalogue and the photographs should have produced. */
const fromPdf = Object.values(map.products).map((entry) => entry.name);
const fromImages = Object.values(manifest)
  .filter((entry) => !entry.skip && !entry.product && entry.name)
  .map((entry) => entry.name);

for (const name of fromPdf) if (!names.has(name)) problems.push(`missing (printed catalogue): ${name}`);
for (const name of fromImages) if (!names.has(name)) problems.push(`missing (supplied photo): ${name}`);

const expected = fromPdf.length + fromImages.length;
const extra = data.products.length - expected;

/* Structural checks. */
const slugs = new Set();
const categoryIds = new Set(data.categories.map((category) => category.id));

for (const product of data.products) {
  if (slugs.has(product.slug)) problems.push(`duplicate slug: ${product.slug}`);
  slugs.add(product.slug);

  if (!categoryIds.has(product.category_id)) {
    problems.push(`${product.name}: unknown category "${product.category_id}"`);
  }

  if (!product.image_url) {
    problems.push(`${product.name}: no photograph`);
  } else if (!/^https?:/.test(product.image_url)) {
    const file = path.join(root, "public", product.image_url.replace(/^\//, ""));
    if (!existsSync(file)) problems.push(`${product.name}: image file missing (${product.image_url})`);
  }
}

/* Image files nothing points at. */
const imagesDir = path.join(root, "public/products");
const used = new Set(
  data.products
    .map((product) => product.image_url && path.basename(product.image_url))
    .filter(Boolean),
);
const orphans = existsSync(imagesDir)
  ? readdirSync(imagesDir).filter((file) => !file.startsWith(".") && !used.has(file))
  : [];

console.log(`\nCatalogue`);
console.log(`  ${data.products.length} products, ${data.categories.length} categories`);
console.log(`  expected at least ${expected} (${fromPdf.length} from the printed catalogue, ${fromImages.length} from supplied photographs)`);
if (extra > 0) console.log(`  ${extra} added since — added in the admin, which is fine`);
if (orphans.length) console.log(`  ! ${orphans.length} unused image file(s): ${orphans.slice(0, 5).join(", ")}${orphans.length > 5 ? "…" : ""}`);

if (problems.length === 0) {
  console.log("\n  ✓ nothing missing\n");
  process.exit(0);
}

console.log(`\n  ✗ ${problems.length} problem(s):`);
for (const problem of problems.slice(0, 25)) console.log(`    - ${problem}`);
if (problems.length > 25) console.log(`    …and ${problems.length - 25} more`);
console.log(`
  Rebuild from source:
    node scripts/import-from-pdf.mjs "<catalogue.pdf>" --fallback-pdf="<older.pdf>"
    node scripts/add-images.mjs images
`);
process.exit(1);
