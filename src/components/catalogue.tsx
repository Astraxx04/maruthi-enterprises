"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, ProductWithCategory } from "@/lib/types";
import { ProductCard } from "./product-card";

type SortKey = "name-asc" | "name-desc" | "category";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "category", label: "Category" },
];

export function Catalogue({
  products,
  categories,
  initialCategory = "all",
  initialQuery = "",
}: {
  products: ProductWithCategory[];
  categories: Category[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortKey>("name-asc");

  // Keep the URL shareable without pulling in a Suspense boundary.
  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (query.trim()) params.set("q", query.trim());
    const next = params.toString();
    window.history.replaceState(null, "", next ? `?${next}` : window.location.pathname);
  }, [category, query]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      if (category !== "all" && product.category?.slug !== category) return false;
      if (!needle) return true;
      return [product.name, product.brand, product.category?.name, product.description]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(needle));
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      if (sort === "category") {
        return (
          (a.category?.sort_order ?? 99) - (b.category?.sort_order ?? 99) ||
          a.name.localeCompare(b.name)
        );
      }
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [products, query, category, sort]);

  const activeCategory = categories.find((item) => item.slug === category);
  const hasFilters = query.trim() !== "" || category !== "all";

  const reset = () => {
    setQuery("");
    setCategory("all");
  };

  return (
    <div>
      {/* Controls */}
      <div className="sticky top-16 z-30 -mx-5 border-b border-line bg-canvas/85 px-5 py-4 backdrop-blur-md lg:-mx-8 lg:px-8">
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
              placeholder="Search by product name, brand or category…"
              aria-label="Search products"
              className="field pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="sr-only">Sort products</label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="field w-auto min-w-[9.5rem] cursor-pointer pr-8"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden">
          <button type="button" className="chip" data-active={category === "all"} onClick={() => setCategory("all")}>
            All products
            <span className="text-[0.6875rem] opacity-70">{products.length}</span>
          </button>
          {categories.map((item) => {
            const count = products.filter((product) => product.category?.slug === item.slug).length;
            if (count === 0) return null;
            return (
              <button
                key={item.id}
                type="button"
                className="chip"
                data-active={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {item.name}
                <span className="text-[0.6875rem] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result summary */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 py-5">
        <p className="text-sm text-muted">
          Showing <span className="font-semibold text-ink">{visible.length}</span> of {products.length} products
          {activeCategory ? <> in <span className="font-semibold text-ink">{activeCategory.name}</span></> : null}
        </p>
        {hasFilters && (
          <button type="button" onClick={reset} className="text-sm font-medium text-brand-700 hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="animate-fade rounded-xl2 border border-dashed border-line bg-surface px-6 py-20 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-card text-muted shadow-card">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-ink">No products match your search</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            Try a different spelling or clear the filters. If you need something that is not listed, send us an
            enquiry and we will source it for you.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={reset} className="btn btn-secondary btn-sm">Clear filters</button>
            <a href="/contact" className="btn btn-primary btn-sm">Request a product</a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
