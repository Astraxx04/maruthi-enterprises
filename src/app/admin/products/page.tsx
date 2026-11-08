import Link from "next/link";
import { getCategories, getProducts } from "@/lib/store";
import { ProductGrid } from "@/components/admin/product-grid";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const [{ saved, deleted }, products, categories] = await Promise.all([
    searchParams,
    getProducts(),
    getCategories(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-sm text-muted">{products.length} products in the catalogue.</p>
        </div>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">Add product</Link>
      </div>

      {(saved || deleted) && (
        <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-800">
          {saved ? "Product saved." : "Product deleted."}
        </p>
      )}

      <div className="mt-6">
        <ProductGrid products={products} categories={categories} />
      </div>
    </div>
  );
}
