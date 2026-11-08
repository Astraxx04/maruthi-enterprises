"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductWithCategory } from "@/lib/types";
import { parsePackSizes } from "@/lib/pack-sizes";
import { useCart } from "./cart-context";
import { useToast } from "./toast";
import { QuantityInput } from "./quantity-input";
import { SizePicker } from "./size-picker";

export function AddToEnquiry({ product }: { product: ProductWithCategory }) {
  const { add, quantityOf, quantityOfSize } = useCart();
  const { notify } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [picking, setPicking] = useState(false);
  const inEnquiry = quantityOf(product.id);
  const sizes = parsePackSizes(product.pack_size);
  const hasSizes = sizes.length > 1;
  const chosen = sizes.filter((size) => quantityOfSize(product.id, size) > 0);

  return (
    <div>
      {hasSizes ? (
        <>
          <p className="label">Quantity required</p>
          <p className="mb-3 text-sm text-muted">
            Available in {sizes.length} sizes — set a quantity for each size you need.
          </p>
          <button
            type="button"
            onClick={() => setPicking(true)}
            aria-haspopup="dialog"
            className="btn btn-primary w-full"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {chosen.length > 0 ? "Edit sizes in enquiry" : "Choose sizes & add to enquiry"}
          </button>
          <SizePicker product={product} sizes={sizes} open={picking} onClose={() => setPicking(false)} />
        </>
      ) : (
        <>
          <label className="label" htmlFor="qty">Quantity required</label>
          <div className="flex flex-wrap items-center gap-3">
            <QuantityInput value={quantity} onChange={setQuantity} label={`Quantity for ${product.name}`} />
            <button
              type="button"
              onClick={() => {
                add(product.id, quantity);
                notify(`${product.name} — ${quantity} added to enquiry`);
                setQuantity(1);
              }}
              className="btn btn-primary flex-1"
            >
              Add to Enquiry
            </button>
          </div>
        </>
      )}

      {inEnquiry > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-brand-700">
          <span className="font-semibold">
            {inEnquiry.toLocaleString("en-IN")} already in your enquiry
            {chosen.length > 0 &&
              ` (${chosen.map((size) => `${size} × ${quantityOfSize(product.id, size).toLocaleString("en-IN")}`).join(", ")})`}
            .
          </span>
          <Link href="/enquiry" className="underline underline-offset-2">Review enquiry</Link>
        </p>
      )}
    </div>
  );
}
