"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Category, ProductWithCategory } from "@/lib/types";
import { ProductImage } from "@/components/product-image";
import { deleteProductAction, toggleProductFlagAction } from "@/app/admin/actions";

type SortKey = "catalogue" | "name" | "recent";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "catalogue", label: "Catalogue order" },
  { value: "name", label: "Name (A → Z)" },
  { value: "recent", label: "Recently added" },
];

export function ProductGrid({
  products,
  categories,
}: {
  products: ProductWithCategory[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("catalogue");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = products.filter((product) => {
      if (category !== "all" && product.category_id !== category) return false;
      if (featuredOnly && !product.featured) return false;
      if (!needle) return true;
      return [product.name, product.brand, product.category?.name, product.pack_size]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(needle));
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") return products.indexOf(b) - products.indexOf(a);
      return (
        (a.category?.sort_order ?? 99) - (b.category?.sort_order ?? 99) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        a.name.localeCompare(b.name)
      );
    });
    return sorted;
  }, [products, query, category, sort, featuredOnly]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category_id, (map.get(product.category_id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const hasFilters = query.trim() !== "" || category !== "all" || featuredOnly;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, brand, category or pack size…"
            aria-label="Search products"
            className="field pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="admin-category" className="sr-only">Category</label>
          <select
            id="admin-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="field w-auto cursor-pointer"
          >
            <option value="all">All categories ({products.length})</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({counts.get(item.id) ?? 0})
              </option>
            ))}
          </select>

          <label htmlFor="admin-sort" className="sr-only">Sort</label>
          <select
            id="admin-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="field w-auto cursor-pointer"
          >
            {SORTS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <label className="flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink-soft transition-colors hover:border-brand-300">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(event) => setFeaturedOnly(event.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Featured
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 py-4">
        <p className="text-sm text-muted">
          Showing <span className="font-semibold text-ink">{visible.length}</span> of {products.length} products
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setFeaturedOnly(false);
            }}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-line bg-white px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-ink">No products match</h3>
          <p className="mt-1.5 text-sm text-muted">Try a different search, or clear the filters.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductAdminCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductAdminCard({ product }: { product: ProductWithCategory }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl2 border border-line bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card">
      {/* Photograph — the same framing the printed card uses */}
      <div className="relative border-b border-line-soft">
        <Link href={`/admin/products/${product.id}`} aria-label={`Edit ${product.name}`}>
          <ProductImage src={product.image_url} alt={product.name} sizes="(max-width: 640px) 50vw, 220px" />
        </Link>

        <form action={toggleProductFlagAction} className="absolute left-2 top-2">
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="flag" value="featured" />
          <input type="hidden" name="value" value={String(!product.featured)} />
          <button
            type="submit"
            title={product.featured ? "Remove from the homepage" : "Show on the homepage"}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-wide shadow-sm backdrop-blur transition-colors ${
              product.featured
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-white/90 text-muted opacity-0 hover:text-ink group-hover:opacity-100"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill={product.featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 4 2.3 4.9 5.2.7-3.8 3.7.9 5.3-4.6-2.6-4.6 2.6.9-5.3L4.5 9.6l5.2-.7L12 4Z" />
            </svg>
            {product.featured ? "Featured" : "Feature"}
          </button>
        </form>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-brand-600">
          {product.category?.name ?? "Uncategorised"}
        </p>

        <h3 className="mt-1 line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-ink">
          <Link href={`/admin/products/${product.id}`} className="transition-colors hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        {product.brand && <p className="mt-0.5 truncate text-xs text-muted">{product.brand}</p>}

        <p className="mt-1.5 line-clamp-1 text-[0.6875rem] text-muted">
          {product.pack_size ? `Sizes: ${product.pack_size}` : "No pack sizes set"}
        </p>

        {/* Actions */}
        <div className="mt-auto flex gap-1.5 pt-3">
          <Link href={`/admin/products/${product.id}`} className="btn btn-secondary btn-sm flex-1 px-2">
            Edit
          </Link>

          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            title="View on the website"
            aria-label={`View ${product.name} on the website`}
            className="btn btn-secondary btn-sm px-2"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6" />
              <path d="M20 4 10 14" />
              <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
          </Link>

          <form
            action={deleteProductAction}
            onSubmit={(event) => {
              if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={product.id} />
            <button
              type="submit"
              title="Delete product"
              aria-label={`Delete ${product.name}`}
              className="btn btn-sm border border-line bg-white px-2 text-[#b4253c] hover:bg-[#fdecef]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                <path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
