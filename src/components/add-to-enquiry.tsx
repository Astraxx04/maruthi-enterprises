"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductWithCategory } from "@/lib/types";
import { useCart } from "./cart-context";
import { useToast } from "./toast";
import { QuantityInput } from "./quantity-input";

export function AddToEnquiry({ product }: { product: ProductWithCategory }) {
  const { add, quantityOf } = useCart();
  const { notify } = useToast();
  const [quantity, setQuantity] = useState(1);
  const inEnquiry = quantityOf(product.id);

  return (
    <div>
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

      {inEnquiry > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-brand-700">
          <span className="font-semibold">{inEnquiry.toLocaleString("en-IN")} already in your enquiry.</span>
          <Link href="/enquiry" className="underline underline-offset-2">Review enquiry</Link>
        </p>
      )}
    </div>
  );
}
