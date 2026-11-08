/**
 * Adds product photographs to the catalogue.
 *
 *   node scripts/add-images.mjs ~/Desktop/new-photos
 *   node scripts/add-images.mjs photo.jpg --name="Zandu Balm Ultra" --category="Pain Relief & Balms"
 *   node scripts/add-images.mjs ~/Desktop/new-photos --dry-run
 *   node scripts/add-images.mjs --clean            # tidy the images already in the catalogue
 *
 * For every image it:
 *   1. trims the blank border,
 *   2. turns an off-white background into clean white (or transparent with --transparent),
 *   3. resizes it to a sensible print/web size,
 *   4. attaches it to the product whose name matches the file name — or, if
 *      nothing matches, creates a new product in the closest category.
 *
 * Both the website and the printed catalogue read data/catalogue.json, so a
 * product added here shows up in both.
 */
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, mkdtempSync, renameSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Atomic write: a temporary file in the same directory, then rename. */
function writeCatalogue(target, value) {
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, value);
  renameSync(temporary, target);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(root, "data/catalogue.json");
const IMAGES = path.join(root, "public/products");
const KEYWORDS = path.join(root, "scripts/category-keywords.json");
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff", ".heic", ".jxl"]);
/** sharp cannot read these; macOS "sips" converts them first. */
const NEEDS_CONVERSION = new Set([".jxl", ".heic"]);

/* ──────────────────────────────────────────────────────────── arguments ─── */
const argv = process.argv.slice(2);
const flags = {};
const inputs = [];
for (const arg of argv) {
  if (arg.startsWith("--")) {
    const [key, ...rest] = arg.slice(2).split("=");
    flags[key] = rest.length ? rest.join("=") : true;
  } else inputs.push(arg);
}

const options = {
  dryRun: Boolean(flags["dry-run"]),
  transparent: Boolean(flags.transparent),
  clean: Boolean(flags.clean),
  maxSize: Number(flags.max ?? 1400),
  trimThreshold: Number(flags["trim-threshold"] ?? 12),
  whiteThreshold: Number(flags["white-threshold"] ?? 244),
  quality: Number(flags.quality ?? 86),
  forcedName: typeof flags.name === "string" ? flags.name : null,
  forcedCategory: typeof flags.category === "string" ? flags.category : null,
  forcedProduct: typeof flags.product === "string" ? flags.product : null,
  sizes: typeof flags.sizes === "string" ? flags.sizes : null,
  manifest: typeof flags.manifest === "string" ? flags.manifest : null,
  brand: typeof flags.brand === "string" ? flags.brand : null,
  noBackground: Boolean(flags["keep-background"]) === false,
};

if (!options.clean && inputs.length === 0) {
  console.error(`Usage:
  node scripts/add-images.mjs <image-or-folder> [more…] [options]
  node scripts/add-images.mjs --clean [--product=<slug>]

Options:
  --name="Product Name"      name for a single image (otherwise taken from the file name)
  --category="Category"      force the category instead of guessing
  --product=<slug>           replace the photograph of one existing product
  --brand="Brand"            brand for new products
  --sizes="9 ml, 30 ml"      pack sizes for new products
  --transparent              keep a transparent background (writes PNG)
  --keep-background          do not whiten the background
  --max=1400                 longest edge in pixels
  --quality=86               JPEG quality
  --trim-threshold=12        how aggressively to trim the border (higher = more)
  --manifest=file.json       name/category per file (see below)
  --dry-run                  show what would happen, change nothing

A manifest lets you name files whose names say nothing. If the folder contains
manifest.json it is picked up automatically:

  {
    "71kk3MRbGyL.jpg": { "name": "LuvLap Baby Wipes", "category": "Baby Care",
                         "brand": "LuvLap", "sizes": "72 wipes" },
    "kayam.jpg":       { "product": "kayam-churna" }
  }`);
  process.exit(1);
}

/* ─────────────────────────────────────────────────────────────── helpers ── */
const slugify = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const STOP_WORDS = new Set(["the", "and", "with", "for", "of", "in", "a", "an", "new", "img", "image", "photo", "final", "copy"]);

const tokens = (value) =>
  new Set(
    slugify(value)
      .split("-")
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word) && !/^\d+$/.test(word)),
  );

/** Overlap score between two token sets, weighted towards the shorter one. */
function similarity(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

function titleCase(value) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word.length <= 3 && word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join(" ");
}

function collectImages(target) {
  const full = path.resolve(target);
  if (!existsSync(full)) {
    console.error(`! not found: ${target}`);
    return [];
  }
  if (statSync(full).isDirectory()) {
    return readdirSync(full)
      .filter((file) => EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort()
      .map((file) => path.join(full, file));
  }
  return EXTENSIONS.has(path.extname(full).toLowerCase()) ? [full] : [];
}

/* ───────────────────────────────────────────────────────── image pipeline ─ */
let scratch = null;

/** Formats sharp cannot open are converted with sips (macOS) first. */
function readable(file) {
  if (!NEEDS_CONVERSION.has(path.extname(file).toLowerCase())) return file;
  if (process.platform !== "darwin") {
    throw new Error(`cannot read ${path.extname(file)} on this platform — convert it to PNG first`);
  }
  scratch ??= mkdtempSync(path.join(os.tmpdir(), "catalogue-img-"));
  const converted = path.join(scratch, `${path.basename(file, path.extname(file))}.png`);
  execFileSync("sips", ["-s", "format", "png", file, "--out", converted], { stdio: "ignore" });
  return converted;
}

/**
 * Trim the border, optionally drop the background, resize and encode.
 * Returns { buffer, extension, width, height }.
 */
async function processImage(file) {
  let pipeline = sharp(readable(file), { failOn: "none" }).rotate();

  // Trim whatever flat colour surrounds the product.
  pipeline = pipeline.trim({ threshold: options.trimThreshold });

  if (options.noBackground) {
    // Near-white pixels become fully transparent…
    pipeline = pipeline.ensureAlpha().unflatten({ threshold: options.whiteThreshold });

    // …then sit on clean white, unless transparency was asked for. This has to
    // be a second pass: sharp runs flatten before unflatten within one
    // pipeline, which would leave the background transparent — and therefore
    // black once it is encoded as JPEG.
    if (!options.transparent) {
      pipeline = sharp(await pipeline.png().toBuffer()).flatten({ background: "#ffffff" });
    }
  }

  pipeline = pipeline.resize({
    width: options.maxSize,
    height: options.maxSize,
    fit: "inside",
    withoutEnlargement: true,
  });

  const output = options.transparent
    ? pipeline.png({ compressionLevel: 9 })
    : pipeline.jpeg({ quality: options.quality, mozjpeg: true });

  const { data, info } = await output.toBuffer({ resolveWithObject: true });
  return { buffer: data, extension: options.transparent ? "png" : "jpg", width: info.width, height: info.height };
}

/* ────────────────────────────────────────────────────────────────── data ── */
/** filename → { name, category, brand, sizes, product } */
function loadManifest(inputs) {
  const candidates = [];
  if (options.manifest) candidates.push(path.resolve(options.manifest));
  for (const input of inputs) {
    const full = path.resolve(input);
    const dir = existsSync(full) && statSync(full).isDirectory() ? full : path.dirname(full);
    candidates.push(path.join(dir, "manifest.json"));
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    console.log(`manifest: ${path.relative(process.cwd(), candidate)}`);
    return JSON.parse(readFileSync(candidate, "utf8"));
  }
  if (options.manifest) throw new Error(`manifest not found: ${options.manifest}`);
  return {};
}

const data = JSON.parse(readFileSync(DATA, "utf8"));
const keywords = existsSync(KEYWORDS) ? JSON.parse(readFileSync(KEYWORDS, "utf8")) : {};
const categoryByName = new Map(data.categories.map((category) => [category.name.toLowerCase(), category]));

/** Products are matched on name, brand and slug together. */
const productIndex = data.products.map((product) => ({
  product,
  tokens: tokens(`${product.name} ${product.brand ?? ""}`),
}));

function matchProduct(name) {
  let best = null;
  const wanted = tokens(name);
  for (const entry of productIndex) {
    const score = similarity(wanted, entry.tokens);
    if (!best || score > best.score) best = { product: entry.product, score };
  }
  return best && best.score >= 0.6 ? best : null;
}

function guessCategory(name) {
  const wanted = tokens(name);
  const lower = name.toLowerCase();
  const scores = new Map();

  for (const category of data.categories) {
    let score = similarity(wanted, tokens(category.name)) * 2;

    for (const hint of keywords[category.name] ?? []) {
      if (lower.includes(hint)) score += 1.5;
    }

    // The single most similar product in the category — not the sum, which
    // would simply favour whichever category holds the most products.
    let closest = 0;
    for (const product of data.products) {
      if (product.category_id !== category.id) continue;
      closest = Math.max(closest, similarity(wanted, tokens(`${product.name} ${product.brand ?? ""}`)));
    }
    score += closest * 2;

    scores.set(category, score);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return { category: ranked[0][0], score: ranked[0][1], runnerUp: ranked[1]?.[0]?.name };
}

/* ────────────────────────────────────────────────────────────── clean mode ─ */
if (options.clean) {
  let changed = 0;
  const targets = options.forcedProduct
    ? data.products.filter((product) => product.slug === options.forcedProduct)
    : data.products;
  if (options.forcedProduct && targets.length === 0) {
    console.error(`! no product with slug "${options.forcedProduct}"`);
    process.exit(1);
  }
  for (const product of targets) {
    if (!product.image_url || /^https?:/.test(product.image_url)) continue;
    const file = path.join(root, "public", product.image_url.replace(/^\//, ""));
    if (!existsSync(file)) {
      console.warn(`! missing  ${product.name}: ${product.image_url}`);
      continue;
    }
    const before = statSync(file).size;
    const { buffer, extension, width, height } = await processImage(file);
    const target = path.join(IMAGES, `${product.slug}.${extension}`);
    console.log(
      `${options.dryRun ? "would clean" : "cleaned"}  ${product.name} → ${width}×${height}, ` +
        `${(before / 1024).toFixed(0)} KB → ${(buffer.length / 1024).toFixed(0)} KB`,
    );
    if (!options.dryRun) {
      writeFileSync(target, buffer);
      product.image_url = `/products/${product.slug}.${extension}`;
    }
    changed += 1;
  }
  if (!options.dryRun && changed) writeCatalogue(DATA, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\n${changed} image(s) ${options.dryRun ? "would be" : ""} cleaned.`);
  process.exit(0);
}

/* ─────────────────────────────────────────────────────────── import mode ── */
const manifest = loadManifest(inputs);
const files = inputs.flatMap(collectImages);
if (files.length === 0) {
  console.error("No images found.");
  process.exit(1);
}
if (options.forcedName && files.length > 1) {
  console.error("--name can only be used with a single image.");
  process.exit(1);
}

mkdirSync(IMAGES, { recursive: true });

const takenSlugs = new Set(data.products.map((product) => product.slug));
let attached = 0;
let created = 0;

for (const file of files) {
  const base = path.basename(file, path.extname(file));
  const entry = manifest[path.basename(file)] ?? {};
  if (entry.skip) {
    console.log(`→ ${path.basename(file)}
  skipped (manifest)`);
    continue;
  }
  const name = options.forcedName ?? entry.name ?? titleCase(base);
  const wantedProduct = options.forcedProduct ?? entry.product ?? null;
  const wantedCategory = options.forcedCategory ?? entry.category ?? null;
  const brand = options.brand ?? entry.brand ?? null;
  const sizes = options.sizes ?? entry.sizes ?? null;
  const description = entry.description ?? null;

  let target = null;
  if (wantedProduct) {
    target = data.products.find((product) => product.slug === wantedProduct);
    if (!target) {
      console.error(`! no product with slug "${wantedProduct}"`);
      continue;
    }
  } else if (!wantedCategory) {
    const match = matchProduct(name);
    if (match) target = match.product;
  }

  const { buffer, extension, width, height } = await processImage(file);

  if (target) {
    const slug = target.slug;
    console.log(`→ ${path.basename(file)}`);
    console.log(`  matched  "${target.name}"  (${width}×${height}, ${(buffer.length / 1024).toFixed(0)} KB)`);
    if (!options.dryRun) {
      writeFileSync(path.join(IMAGES, `${slug}.${extension}`), buffer);
      target.image_url = `/products/${slug}.${extension}`;
      if (sizes) target.pack_size = sizes.split(/\s*,\s*/).join(" · ");
      if (brand) target.brand = brand;
    }
    attached += 1;
    continue;
  }

  const forced = wantedCategory ? categoryByName.get(wantedCategory.toLowerCase()) : null;
  if (wantedCategory && !forced) {
    console.error(`! unknown category "${wantedCategory}". Known: ${data.categories.map((c) => c.name).join(", ")}`);
    continue;
  }

  const guess = forced ? { category: forced, score: Infinity, runnerUp: null } : guessCategory(name);
  const category = guess.category;

  let slug = slugify(name);
  let suffix = 2;
  while (takenSlugs.has(slug)) slug = `${slugify(name)}-${suffix++}`;
  takenSlugs.add(slug);

  const sortOrder =
    data.products.filter((product) => product.category_id === category.id).length + 1;

  const product = {
    id: slug,
    name,
    slug,
    brand: brand,
    category_id: category.id,
    description,
    unit: null,
    pack_size: sizes ? sizes.split(/\s*,\s*/).join(" · ") : null,
    image_url: `/products/${slug}.${extension}`,
    featured: false,
    sort_order: sortOrder,
  };

  console.log(`→ ${path.basename(file)}`);
  console.log(`  new product  "${name}"  (${width}×${height}, ${(buffer.length / 1024).toFixed(0)} KB)`);
  console.log(
    `  category     ${category.name}${forced ? " (forced)" : guess.runnerUp ? `  [next best: ${guess.runnerUp}]` : ""}`,
  );

  if (!options.dryRun) {
    writeFileSync(path.join(IMAGES, `${slug}.${extension}`), buffer);
    data.products.push(product);
  }
  created += 1;
}

if (!options.dryRun && (attached || created)) {
  writeCatalogue(DATA, `${JSON.stringify(data, null, 2)}\n`);
}

console.log(`\n${attached} photograph(s) replaced, ${created} product(s) created.`);
if (options.dryRun) console.log("Dry run — nothing was written.");
else if (created) console.log("Add descriptions and pack sizes for the new products at /admin/products.");
