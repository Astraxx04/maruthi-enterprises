import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/store";
import { ProductForm } from "@/components/admin/product-form";
import { collectUnits } from "@/lib/pack-sizes";
import { duplicateProductAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ duplicated?: string }>;
}) {
  const [{ id }, { duplicated }, products, categories] = await Promise.all([
    params,
    searchParams,
    getProducts(),
    getCategories(),
  ]);
  const product = products.find((item) => item.id === id);
  if (!product) notFound();

  const units = collectUnits(products.map((item) => item.pack_size));

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-muted hover:text-brand-700">← Back to products</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/products/${product.slug}`} target="_blank" className="btn btn-secondary btn-sm">
            View on site
          </Link>

          <form action={duplicateProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" className="btn btn-secondary btn-sm">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
              </svg>
              Duplicate
            </button>
          </form>
        </div>
      </div>

      {duplicated && (
        <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-800">
          Copied. Give it a new name and change whatever differs, then save.
        </p>
      )}

      <div className="mt-6">
        <ProductForm categories={categories} product={product} units={units} />
      </div>
    </div>
  );
}
