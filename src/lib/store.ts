import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getAdminClient, getPublicClient, supabaseConfigured } from "./supabase";
import type { Category, Enquiry, EnquiryItem, Product, ProductWithCategory } from "./types";

/**
 * Data access layer.
 *
 * When Supabase environment variables are present every read and write goes to
 * Postgres. Otherwise the app falls back to `data/catalogue.json` so the site is
 * fully usable locally without any configuration. The JSON fallback is for
 * development only — serverless file systems are read-only in production.
 */

const FILE = path.join(process.cwd(), "data", "catalogue.json");

type FileShape = { categories: Category[]; products: Product[]; enquiries: Enquiry[] };

let writeQueue: Promise<unknown> = Promise.resolve();

/**
 * Writes to a temporary file in the same directory and renames it into place.
 * rename() is atomic, so a reader never sees a half-written catalogue and two
 * writers cannot interleave into one truncated file.
 */
async function writeAtomic(db: FileShape): Promise<void> {
  const temporary = `${FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await fs.rename(temporary, FILE);
}

async function readFile(): Promise<FileShape> {
  const raw = await fs.readFile(FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<FileShape>;
  return {
    categories: parsed.categories ?? [],
    products: parsed.products ?? [],
    enquiries: parsed.enquiries ?? [],
  };
}

function withFile<T>(fn: (db: FileShape) => Promise<T> | T, persist = true): Promise<T> {
  const run = async () => {
    const db = await readFile();
    const result = await fn(db);
    if (persist) await writeAtomic(db);
    return result;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  return next;
}

export const usingSupabase = supabaseConfigured;

// Not during `next build`, which legitimately reads the committed JSON, and not
// more than once per process.
if (
  !usingSupabase &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  // Serverless file systems are read-only, so every admin save would fail with
  // a confusing error. Better to say exactly what is wrong, once, at startup.
  console.error(
    "[store] Supabase is not configured. The catalogue is being read from data/catalogue.json, " +
      "which cannot be written to in production — admin changes and enquiries will fail. " +
      "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.",
  );
}

/* ------------------------------------------------------------------ reads */

export async function getCategories(): Promise<Category[]> {
  if (usingSupabase) {
    const db = getPublicClient()!;
    const { data, error } = await db.from("categories").select("*").order("sort_order").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Category[];
  }
  const db = await withFile((d) => d.categories, false);
  return [...db].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export async function getProducts(): Promise<ProductWithCategory[]> {
  if (usingSupabase) {
    const db = getPublicClient()!;
    const { data, error } = await db
      .from("products")
      .select("*, category:categories(*)")
      .order("sort_order")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProductWithCategory[];
  }
  const file = await withFile((d) => d, false);
  const byId = new Map(file.categories.map((c) => [c.id, c]));
  return file.products
    .map((p) => ({ ...p, category: byId.get(p.category_id) ?? null }))
    .sort(
      (a, b) =>
        (a.category?.sort_order ?? 99) - (b.category?.sort_order ?? 99) ||
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name),
    );
}

export async function getProductBySlug(slug: string): Promise<ProductWithCategory | null> {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getProductsByIds(ids: string[]): Promise<ProductWithCategory[]> {
  if (ids.length === 0) return [];
  const all = await getProducts();
  const wanted = new Set(ids);
  return all.filter((p) => wanted.has(p.id));
}

/* ------------------------------------------------------- product mutations */

export type ProductInput = Omit<Product, "id" | "created_at" | "updated_at"> & { id?: string };

export async function createProduct(input: ProductInput): Promise<Product> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { data, error } = await db.from("products").insert(input).select().single();
    if (error) throw new Error(error.message);
    return data as Product;
  }
  return withFile((d) => {
    const product: Product = { ...input, id: input.id ?? randomUUID(), created_at: new Date().toISOString() };
    d.products.push(product);
    return product;
  });
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<Product> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { data, error } = await db
      .from("products")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Product;
  }
  return withFile((d) => {
    const index = d.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Product not found");
    d.products[index] = { ...d.products[index], ...patch, updated_at: new Date().toISOString() };
    return d.products[index];
  });
}

export async function deleteProduct(id: string): Promise<void> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  await withFile((d) => {
    d.products = d.products.filter((p) => p.id !== id);
  });
}

/* ------------------------------------------------------ category mutations */

export type CategoryInput = Omit<Category, "id"> & { id?: string };

export async function createCategory(input: CategoryInput): Promise<Category> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { data, error } = await db.from("categories").insert(input).select().single();
    if (error) throw new Error(error.message);
    return data as Category;
  }
  return withFile((d) => {
    const category: Category = { ...input, id: input.id ?? randomUUID() };
    d.categories.push(category);
    return category;
  });
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<Category> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { data, error } = await db.from("categories").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data as Category;
  }
  return withFile((d) => {
    const index = d.categories.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Category not found");
    d.categories[index] = { ...d.categories[index], ...patch };
    return d.categories[index];
  });
}

/** Categories that still have products cannot be removed. */
export async function deleteCategory(id: string): Promise<void> {
  const products = await getProducts();
  if (products.some((p) => p.category_id === id)) {
    throw new Error("Move or delete the products in this category first");
  }
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { error } = await db.from("categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  await withFile((d) => {
    d.categories = d.categories.filter((c) => c.id !== id);
  });
}

/* ------------------------------------------------------------- enquiries */

export type EnquiryInput = {
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  remarks: string | null;
  items: EnquiryItem[];
};

export async function createEnquiry(input: EnquiryInput): Promise<Enquiry> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { data, error } = await db.from("enquiries").insert({ ...input, status: "new" }).select().single();
    if (error) throw new Error(error.message);
    return data as Enquiry;
  }
  return withFile((d) => {
    const enquiry: Enquiry = {
      ...input,
      id: randomUUID(),
      status: "new",
      created_at: new Date().toISOString(),
    };
    d.enquiries.unshift(enquiry);
    return enquiry;
  });
}

export async function getEnquiries(): Promise<Enquiry[]> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { data, error } = await db.from("enquiries").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Enquiry[];
  }
  const db = await withFile((d) => d.enquiries, false);
  return [...db].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function updateEnquiryStatus(id: string, status: Enquiry["status"]): Promise<void> {
  if (usingSupabase) {
    const db = getAdminClient();
    if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    const { error } = await db.from("enquiries").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  await withFile((d) => {
    const enquiry = d.enquiries.find((e) => e.id === id);
    if (enquiry) enquiry.status = status;
  });
}

/** Recent enquiries from the same email, used for duplicate detection. */
export async function recentEnquiryExists(email: string, withinMs: number): Promise<boolean> {
  const list = await getEnquiries();
  const cutoff = Date.now() - withinMs;
  return list.some(
    (e) => e.email.toLowerCase() === email.toLowerCase() && new Date(e.created_at).getTime() > cutoff,
  );
}
