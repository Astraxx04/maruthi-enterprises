"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductWithCategory } from "@/lib/types";
import { useCart } from "./cart-context";
import { useToast } from "./toast";
import { QuantityInput } from "./quantity-input";
import { ProductImage } from "./product-image";

type Props = {
  product: ProductWithCategory;
  sizes: string[];
  open: boolean;
  onClose: () => void;
};

/**
 * Lets a customer set a separate quantity for each pack size of one product.
 * Opens pre-filled with what is already in the enquiry, and saving replaces
 * those quantities (a size set to 0 is taken out).
 */
export function SizePicker({ product, sizes, open, onClose }: Props) {
  const { quantityOfSize, setSizes } = useCart();
  const { notify } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Native <dialog> gives us the backdrop, Esc to close and a focus trap.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuantities(Object.fromEntries(sizes.map((size) => [size, quantityOfSize(product.id, size)])));
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // quantityOfSize changes with every cart update; only re-seed on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalUnits = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const chosenSizes = Object.values(quantities).filter((quantity) => quantity > 0).length;
  const hadAny = sizes.some((size) => quantityOfSize(product.id, size) > 0);

  const save = () => {
    setSizes(product.id, quantities);
    if (totalUnits === 0) notify(`${product.name} removed from enquiry`);
    else
      notify(
        `${product.name} — ${totalUnits.toLocaleString("en-IN")} units in ${chosenSizes} ${
          chosenSizes === 1 ? "size" : "sizes"
        }`,
      );
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby={`sizes-${product.id}-title`}
      className="m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border border-line bg-card p-0 text-ink shadow-lift backdrop:bg-black/55 backdrop:backdrop-blur-sm open:animate-rise"
    >
      <div className="flex items-start gap-3 border-b border-line p-4">
        <div className="w-16 shrink-0 overflow-hidden rounded-lg">
          <ProductImage src={product.image_url} alt="" sizes="64px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-brand-600">Choose sizes</p>
          <h2 id={`sizes-${product.id}-title`} className="mt-1 text-base font-semibold leading-snug text-ink">
            {product.name}
          </h2>
          {product.brand && <p className="mt-0.5 text-xs text-muted">{product.brand}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <ul className="max-h-[55vh] divide-y divide-line overflow-y-auto">
        {sizes.map((size) => {
          const quantity = quantities[size] ?? 0;
          return (
            <li
              key={size}
              className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors ${
                quantity > 0 ? "bg-brand-50/60" : ""
              }`}
            >
              <span className={`text-sm font-medium ${quantity > 0 ? "text-ink" : "text-ink-soft"}`}>{size}</span>
              <QuantityInput
                value={quantity}
                min={0}
                onChange={(value) => setQuantities((current) => ({ ...current, [size]: value }))}
                label={`Quantity of ${product.name}, ${size}`}
                size="sm"
              />
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-line p-4">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">{totalUnits.toLocaleString("en-IN")}</span> units
          {chosenSizes > 0 && (
            <>
              {" "}
              · {chosenSizes} {chosenSizes === 1 ? "size" : "sizes"}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={totalUnits === 0 && !hadAny}
          className="btn btn-primary btn-sm px-5"
        >
          {hadAny ? "Update enquiry" : "Add to enquiry"}
        </button>
      </div>
    </dialog>
  );
}
