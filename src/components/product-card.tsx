"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductWithCategory } from "@/lib/types";
import { useCart } from "./cart-context";
import { useToast } from "./toast";
import { QuantityInput } from "./quantity-input";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority = false }: { product: ProductWithCategory; priority?: boolean }) {
  const { add, quantityOf } = useCart();
  const { notify } = useToast();
  const [quantity, setQuantity] = useState(1);
  const inEnquiry = quantityOf(product.id);

  const handleAdd = () => {
    add(product.id, quantity);
    notify(`${product.name} — ${quantity} added to enquiry`);
    setQuantity(1);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl2 border border-line bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <Link href={`/products/${product.slug}`} className="relative block" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-700 shadow-sm backdrop-blur">
            Featured
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
          {product.category && <span className="text-brand-600">{product.category.name}</span>}
          {product.brand && (
            <>
              <span aria-hidden="true" className="text-line">•</span>
              <span className="truncate normal-case tracking-normal">{product.brand}</span>
            </>
          )}
        </div>

        <h3 className="mt-2 text-[0.975rem] font-semibold leading-snug text-ink">
          <Link href={`/products/${product.slug}`} className="transition-colors hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{product.description}</p>
        )}

        {product.pack_size && (
          <dl className="mt-3 flex gap-1.5 text-xs text-muted">
            <dt className="font-medium text-ink-soft">Sizes:</dt>
            <dd>{product.pack_size}</dd>
          </dl>
        )}

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2">
            <QuantityInput
              value={quantity}
              onChange={setQuantity}
              label={`Quantity for ${product.name}`}
              size="sm"
            />
            <button type="button" onClick={handleAdd} className="btn btn-primary btn-sm flex-1">
              Add to Enquiry
            </button>
          </div>

          {inEnquiry > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12.5 9 17.5 20 6.5" />
              </svg>
              {inEnquiry.toLocaleString("en-IN")} in your enquiry
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
