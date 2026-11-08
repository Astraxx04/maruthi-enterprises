/**
 * Moves the product photographs from the repository into Supabase Storage.
 *
 *   node --env-file=.env.local scripts/upload-images-to-storage.mjs --dry-run
 *   node --env-file=.env.local scripts/upload-images-to-storage.mjs
 *
 * For every product whose image_url is a path inside the site (/products/…),
 * the local file is uploaded to the public bucket and the product — in both
 * Supabase and data/catalogue.json — is repointed at the bucket's URL. Once it
 * reports everything verified, public/products/ can be deleted.
 *
 * Safe to re-run: products already pointing at an https URL are skipped unless
 * --force is passed.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(root, "data/catalogue.json");

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

const trimUrl = (value) =>
  value && value.trim().replace(/\/+$/, "").replace(/\/(rest|auth|storage)\/v1$/, "");

const url = trimUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/* ───────────────────────────────────────────────────────── the products ── */
const { data: products, error } = await db
  .from("products")
  .select("id, slug, name, image_url")
  .order("name")
  .limit(5000);

if (error) {
  console.error("Could not read products:", error.message);
  process.exit(1);
}

const local = products.filter(
  (product) => product.image_url && (force || !/^https?:/i.test(product.image_url)),
);
const alreadyRemote = products.length - local.length;

console.log(`\n${products.length} products in the database`);
if (alreadyRemote) console.log(`  ${alreadyRemote} already served from storage`);
console.log(`  ${local.length} to upload\n`);

if (local.length === 0) {
  console.log("Nothing to do.\n");
  process.exit(0);
}

/* ────────────────────────────────────────────────────────────── upload ── */
const changed = [];
let failed = 0;

for (const product of local) {
  const relative = product.image_url.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "");
  const file = path.join(root, "public", relative);

  if (!existsSync(file)) {
    console.warn(`  ✗ ${product.name}: no local file at public/${relative}`);
    failed += 1;
    continue;
  }

  const name = path.basename(file);
  const contentType = CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";

  if (dryRun) {
    console.log(`  would upload ${name}  (${product.name})`);
    changed.push({ product, publicUrl: `${url}/storage/v1/object/public/${bucket}/${name}` });
    continue;
  }

  const { error: uploadError } = await db.storage
    .from(bucket)
    .upload(name, readFileSync(file), { contentType, upsert: true, cacheControl: "31536000" });

  if (uploadError) {
    console.warn(`  ✗ ${product.name}: ${uploadError.message}`);
    failed += 1;
    continue;
  }

  const { data } = db.storage.from(bucket).getPublicUrl(name);
  const { error: updateError } = await db
    .from("products")
    .update({ image_url: data.publicUrl })
    .eq("id", product.id);

  if (updateError) {
    console.warn(`  ✗ ${product.name}: uploaded, but the row did not update — ${updateError.message}`);
    failed += 1;
    continue;
  }

  changed.push({ product, publicUrl: data.publicUrl });
  if (changed.length % 25 === 0) console.log(`  …${changed.length} done`);
}

console.log(`\n${dryRun ? "Would upload" : "Uploaded"} ${changed.length} photograph(s)`);
if (failed) console.log(`${failed} failed`);

if (dryRun) {
  console.log("\nDry run — nothing was uploaded or changed.\n");
  process.exit(failed ? 1 : 0);
}

/* ─────────────────────────────── keep data/catalogue.json in step ────── */
if (changed.length > 0 && existsSync(DATA)) {
  const catalogue = JSON.parse(readFileSync(DATA, "utf8"));
  const bySlug = new Map(changed.map((entry) => [entry.product.slug, entry.publicUrl]));
  let updated = 0;
  for (const product of catalogue.products) {
    const next = bySlug.get(product.slug);
    if (next && product.image_url !== next) {
      product.image_url = next;
      updated += 1;
    }
  }
  const temporary = `${DATA}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(catalogue, null, 2)}\n`);
  renameSync(temporary, DATA);
  console.log(`data/catalogue.json repointed for ${updated} product(s)`);
}

/* ──────────────────────────────────────────── confirm they really load ── */
console.log("\nChecking the uploaded files are reachable…");
let unreachable = 0;
const sample = changed.length > 40 ? changed.filter((_, i) => i % Math.ceil(changed.length / 40) === 0) : changed;

for (const { product, publicUrl } of sample) {
  const response = await fetch(publicUrl, { method: "HEAD" });
  if (!response.ok) {
    console.warn(`  ✗ ${product.name}: ${response.status} ${publicUrl}`);
    unreachable += 1;
  }
}

if (unreachable) {
  console.log(`\n${unreachable} of ${sample.length} checked are not loading — keep public/products/ for now.\n`);
  process.exit(1);
}

console.log(`  ✓ all ${sample.length} checked load from storage`);
console.log(`
Done. The site now serves photographs from Supabase Storage.

Before deleting public/products/:
  1. npm run build && npm run check:deploy
  2. Deploy, and open the live site to confirm the images appear
  3. Then: git rm -r public/products && git commit

Keep a copy of the folder somewhere until you are happy — re-running
scripts/import-from-pdf.mjs would otherwise be the only way to rebuild it.
`);
