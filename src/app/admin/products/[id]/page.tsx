import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/lib/store";
import { ProductForm } from "@/components/admin/product-form";
import { collectUnits } from "@/lib/pack-sizes";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, products, categories] = await Promise.all([params, getProducts(), getCategories()]);
  const product = products.find((item) => item.id === id);
  if (!product) notFound();

  const units = collectUnits(products.map((item) => item.pack_size));

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-muted hover:text-brand-700">← Back to products</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{product.name}</h1>
        <Link href={`/products/${product.slug}`} target="_blank" className="btn btn-secondary btn-sm">
          View on site
        </Link>
      </div>

      <div className="mt-6">
        <ProductForm categories={categories} product={product} units={units} />
      </div>
    </div>
  );
}
