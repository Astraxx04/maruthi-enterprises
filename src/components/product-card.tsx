"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductWithCategory } from "@/lib/types";
import { useCart } from "./cart-context";
import { useToast } from "./toast";
import { QuantityInput } from "./quantity-input";
import { ProductImage } from "./product-image";
import { SizePicker } from "./size-picker";
import { parsePackSizes } from "@/lib/pack-sizes";

export function ProductCard({ product, priority = false }: { product: ProductWithCategory; priority?: boolean }) {
  const { add, quantityOf, quantityOfSize, setQuantity: setLineQuantity, remove } = useCart();
  const { notify } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [picking, setPicking] = useState(false);
  const inEnquiry = quantityOf(product.id);
  // More than one pack size: quantities are chosen per size in a popup.
  const sizes = parsePackSizes(product.pack_size);
  const hasSizes = sizes.length > 1;
  const unsizedInEnquiry = quantityOfSize(product.id, null);

  const handleAdd = () => {
    add(product.id, quantity);
    notify(`${product.name} — ${quantity} added to enquiry`);
    setQuantity(1);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl sm:rounded-xl2 border border-line bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <Link href={`/products/${product.slug}`} className="relative m-1.5 mb-0 block overflow-hidden rounded-lg sm:m-2 sm:mb-0 sm:rounded-xl" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.featured && (
          <span className="absolute left-2 top-2 rounded-full bg-card/95 px-2 py-0.5 text-[0.625rem] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-700 shadow-sm backdrop-blur">
            Featured
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-5">
        <div className="hidden items-center gap-2 text-[0.6875rem] font-semibold sm:flex uppercase tracking-[0.1em] text-muted">
          {product.category && <span className="text-brand-600">{product.category.name}</span>}
          {product.brand && (
            <>
              <span aria-hidden="true" className="text-line">•</span>
              <span className="truncate normal-case tracking-normal">{product.brand}</span>
            </>
          )}
        </div>

        {product.brand && (
          <p className="truncate text-[0.6875rem] font-medium text-muted sm:hidden">{product.brand}</p>
        )}

        <h3 className="mt-0.5 line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-ink sm:mt-2 sm:line-clamp-none sm:text-[0.975rem]">
          <Link href={`/products/${product.slug}`} className="transition-colors hover:text-brand-700">
            {product.name}
          </Link>
        </h3>

        {product.description && (
          <p className="mt-2 line-clamp-2 hidden text-sm leading-relaxed text-muted sm:block">{product.description}</p>
        )}

        {product.pack_size && (
          <p className="mt-1 truncate text-xs text-muted sm:hidden">
            {hasSizes ? `${sizes.length} sizes` : product.pack_size}
          </p>
        )}

        {product.pack_size && (
          <dl className="mt-3 hidden gap-1.5 text-xs text-muted sm:flex">
            <dt className="font-medium text-ink-soft">Sizes:</dt>
            <dd>{product.pack_size}</dd>
          </dl>
        )}

        {/* Phones: quick-commerce style — ADD, which turns into a stepper. */}
        <div className="mt-auto pt-2.5 sm:hidden">
          {hasSizes ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              aria-haspopup="dialog"
              aria-label={`Choose sizes of ${product.name}`}
              className="h-9 w-full rounded-lg border border-brand-600 bg-brand-50 text-[0.8125rem] font-bold text-brand-700 transition-colors active:bg-brand-100"
            >
              {inEnquiry > 0 ? `${inEnquiry.toLocaleString("en-IN")} added · Edit` : "ADD"}
            </button>
          ) : unsizedInEnquiry > 0 ? (
            <div className="flex h-9 items-stretch overflow-hidden rounded-lg bg-brand-600 text-white">
              <button
                type="button"
                aria-label={`Decrease ${product.name}`}
                onClick={() =>
                  unsizedInEnquiry <= 1
                    ? remove(product.id)
                    : setLineQuantity(product.id, unsizedInEnquiry - 1)
                }
                className="grid w-9 place-items-center text-lg font-bold active:bg-black/10"
              >
                −
              </button>
              <span className="grid flex-1 place-items-center text-sm font-bold" aria-live="polite">
                {unsizedInEnquiry.toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                aria-label={`Increase ${product.name}`}
                onClick={() => add(product.id, 1)}
                className="grid w-9 place-items-center text-lg font-bold active:bg-black/10"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => add(product.id, 1)}
              aria-label={`Add ${product.name} to enquiry`}
              className="h-9 w-full rounded-lg border border-brand-600 bg-brand-50 text-[0.8125rem] font-bold text-brand-700 transition-colors active:bg-brand-100"
            >
              ADD
            </button>
          )}
        </div>

        <div className="mt-auto hidden pt-4 sm:block">
          {hasSizes ? (
            <button
              type="button"
              onClick={() => setPicking(true)}
              aria-haspopup="dialog"
              className="btn btn-primary btn-sm w-full"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {inEnquiry > 0 ? "Edit sizes" : "Add to Enquiry"}
            </button>
          ) : (
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
          )}

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

      {hasSizes && (
        <SizePicker product={product} sizes={sizes} open={picking} onClose={() => setPicking(false)} />
      )}
    </article>
  );
}
