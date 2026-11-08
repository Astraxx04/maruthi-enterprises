import { getCategories, getProducts } from "@/lib/store";
import { CategoryManager } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>;
}) {
  const [{ deleted, error }, categories, products] = await Promise.all([
    searchParams,
    getCategories(),
    getProducts(),
  ]);

  const counts = products.reduce<Record<string, number>>((accumulator, product) => {
    accumulator[product.category_id] = (accumulator[product.category_id] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Categories</h1>
      <p className="mt-1 text-sm text-muted">Categories drive the catalogue filters and the homepage grid.</p>

      {deleted && (
        <p className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-800">
          Category deleted.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-[#fdecef] px-3.5 py-2.5 text-sm font-medium text-[#b4253c]">{error}</p>
      )}

      <div className="mt-6">
        <CategoryManager categories={categories} counts={counts} />
      </div>
    </div>
  );
}
