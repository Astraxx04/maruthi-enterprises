import Link from "next/link";
import { getCategories, getProducts } from "@/lib/store";
import { ProductForm } from "@/components/admin/product-form";
import { collectUnits } from "@/lib/pack-sizes";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const units = collectUnits(products.map((product) => product.pack_size));

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-muted hover:text-brand-700">← Back to products</Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Add a product</h1>
      <p className="mt-1 text-sm text-muted">It appears in the catalogue as soon as you save.</p>

      {categories.length === 0 ? (
        <p className="mt-6 rounded-xl2 border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">
          Create a category first — <Link href="/admin/categories" className="font-medium text-brand-700 underline">manage categories</Link>.
        </p>
      ) : (
        <div className="mt-6">
          <ProductForm categories={categories} units={units} />
        </div>
      )}
    </div>
  );
}
