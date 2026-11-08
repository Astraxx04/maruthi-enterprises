/**
 * Pushes data/catalogue.json into Supabase.
 *
 *   node --env-file=.env.local scripts/seed-supabase.mjs
 *
 * Safe to re-run: categories and products are matched on their slug.
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const seed = JSON.parse(await readFile(new URL("../data/catalogue.json", import.meta.url), "utf8"));

const { data: categories, error: categoryError } = await db
  .from("categories")
  .upsert(
    seed.categories.map(({ name, slug, description, sort_order }) => ({
      name,
      slug,
      description,
      sort_order,
    })),
    { onConflict: "slug" },
  )
  .select();

if (categoryError) {
  console.error("Categories failed:", categoryError.message);
  process.exit(1);
}
console.log(`✓ ${categories.length} categories`);

const categoryIdBySeedId = new Map();
for (const seedCategory of seed.categories) {
  const match = categories.find((category) => category.slug === seedCategory.slug);
  if (match) categoryIdBySeedId.set(seedCategory.id, match.id);
}

const { data: products, error: productError } = await db
  .from("products")
  .upsert(
    seed.products.map((product) => ({
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      category_id: categoryIdBySeedId.get(product.category_id),
      description: product.description,
      specifications: product.specifications,
      unit: product.unit,
      pack_size: product.pack_size,
      image_url: product.image_url,
      featured: product.featured,
      sort_order: product.sort_order,
    })),
    { onConflict: "slug" },
  )
  .select();

if (productError) {
  console.error("Products failed:", productError.message);
  process.exit(1);
}
console.log(`✓ ${products.length} products`);
console.log("Seed complete.");
