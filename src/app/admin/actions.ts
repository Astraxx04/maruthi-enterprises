"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { categorySchema, fieldErrors, firstError, productSchema } from "@/lib/validation";
import { uniqueSlug } from "@/lib/slug";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getCategories,
  getProducts,
  updateCategory,
  updateEnquiryStatus,
  updateProduct,
} from "@/lib/store";
import type { Enquiry } from "@/lib/types";

export type ActionState = { error?: string; fields?: Record<string, string>; ok?: boolean };

function revalidateCatalogue() {
  revalidatePath("/", "layout");
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function saveProductAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = text(formData, "id");
  const parsed = productSchema.safeParse({
    name: text(formData, "name"),
    brand: text(formData, "brand"),
    category_id: text(formData, "category_id"),
    description: text(formData, "description"),
    unit: text(formData, "unit"),
    pack_size: text(formData, "pack_size"),
    image_url: text(formData, "image_url"),
    featured: formData.get("featured") === "on",
    sort_order: text(formData, "sort_order") || 0,
  });

  if (!parsed.success) {
    return { error: firstError(parsed.error), fields: fieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const existing = await getProducts();
  const takenSlugs = existing.filter((product) => product.id !== id).map((product) => product.slug);

  const payload = {
    name: input.name,
    brand: input.brand || null,
    category_id: input.category_id,
    description: input.description || null,
    unit: input.unit || null,
    pack_size: input.pack_size || null,
    image_url: input.image_url || null,
    featured: Boolean(input.featured),
    sort_order: input.sort_order ?? 0,
  };

  try {
    if (id) {
      const current = existing.find((product) => product.id === id);
      const slug =
        current && current.name === input.name ? current.slug : uniqueSlug(input.name, takenSlugs);
      await updateProduct(id, { ...payload, slug });
    } else {
      await createProduct({ ...payload, slug: uniqueSlug(input.name, takenSlugs) });
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the product" };
  }

  revalidateCatalogue();
  redirect("/admin/products?saved=1");
}

/**
 * Copies a product so a near-identical one can be set up without retyping
 * everything. The copy lands on its own edit page, ready to change.
 */
export async function duplicateProductAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  if (!id) return;

  const products = await getProducts();
  const original = products.find((product) => product.id === id);
  if (!original) redirect("/admin/products");

  const name = duplicateName(original.name, products.map((product) => product.name));

  const copy = await createProduct({
    name,
    slug: uniqueSlug(name, products.map((product) => product.slug)),
    brand: original.brand,
    category_id: original.category_id,
    description: original.description,
    unit: original.unit,
    pack_size: original.pack_size,
    // Both products point at the same stored photograph; deleting one never
    // removes the file, so sharing it is safe.
    image_url: original.image_url,
    // A copy starts off the homepage — it is a draft until it has been edited.
    featured: false,
    sort_order: original.sort_order,
  });

  revalidateCatalogue();
  redirect(`/admin/products/${copy.id}?duplicated=1`);
}

/**
 * "Zandu Balm" → "Zandu Balm (duplicate)" → "Zandu Balm (duplicate 2)" …
 * so duplicating a duplicate does not stack the word up.
 */
function duplicateName(original: string, taken: string[]): string {
  const base = original.replace(/\s*\(duplicate(?: \d+)?\)$/i, "").trim();
  // Leave room for the suffix within the 160-character limit the form enforces.
  const trimmed = base.length > 140 ? `${base.slice(0, 140).trimEnd()}…` : base;

  let candidate = `${trimmed} (duplicate)`;
  let counter = 2;
  while (taken.includes(candidate)) {
    candidate = `${trimmed} (duplicate ${counter})`;
    counter += 1;
  }
  return candidate;
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  if (id) await deleteProduct(id);
  revalidateCatalogue();
  redirect("/admin/products?deleted=1");
}

export async function toggleProductFlagAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  const flag = text(formData, "flag");
  const value = text(formData, "value") === "true";
  if (id && flag === "featured") {
    await updateProduct(id, { [flag]: value });
  }
  revalidateCatalogue();
  redirect("/admin/products");
}

export async function saveCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const id = text(formData, "id");
  const parsed = categorySchema.safeParse({
    name: text(formData, "name"),
    description: text(formData, "description"),
    sort_order: text(formData, "sort_order") || 0,
  });

  if (!parsed.success) {
    return { error: firstError(parsed.error), fields: fieldErrors(parsed.error) };
  }

  const existing = await getCategories();
  const taken = existing.filter((category) => category.id !== id).map((category) => category.slug);
  const payload = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    sort_order: parsed.data.sort_order ?? 0,
    slug: uniqueSlug(parsed.data.name, taken),
  };

  try {
    if (id) await updateCategory(id, payload);
    else await createCategory(payload);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the category" };
  }

  revalidateCatalogue();
  return { ok: true };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) return;

  let failure: string | null = null;
  try {
    await deleteCategory(id);
  } catch (error) {
    failure = error instanceof Error ? error.message : "Could not delete the category";
  }

  if (failure) redirect(`/admin/categories?error=${encodeURIComponent(failure)}`);
  revalidateCatalogue();
  redirect("/admin/categories?deleted=1");
}

export async function setEnquiryStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status") as Enquiry["status"];
  if (id && ["new", "contacted", "quoted", "closed"].includes(status)) {
    await updateEnquiryStatus(id, status);
  }
  revalidatePath("/admin/enquiries");
  redirect("/admin/enquiries");
}
