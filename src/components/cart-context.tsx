"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/lib/types";

const STORAGE_KEY = "maruthi.enquiry.v1";

/** A line is one product in one size; the same product can appear once per size. */
const sameLine = (line: CartLine, productId: string, size: string | null) =>
  line.productId === productId && line.size === size;

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  totalLines: number;
  totalUnits: number;
  /** Units of a product across all of its sizes. */
  quantityOf: (productId: string) => number;
  /** Units of a product in one size (null = no size). */
  quantityOfSize: (productId: string, size: string | null) => number;
  add: (productId: string, quantity: number, size?: string | null) => void;
  setQuantity: (productId: string, quantity: number, size?: string | null) => void;
  /** Replaces every sized line of a product; sizes at 0 are removed. */
  setSizes: (productId: string, quantities: Record<string, number>) => void;
  remove: (productId: string, size?: string | null) => void;
  /** Removes a product in every size. */
  removeProduct: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as CartLine).productId === "string" &&
          Number.isFinite((line as CartLine).quantity),
      )
      .map((line) => ({
        productId: line.productId,
        // Enquiries saved before sizes existed have no size field.
        size: typeof line.size === "string" && line.size ? line.size : null,
        quantity: clamp(line.quantity),
      }));
  } catch {
    return [];
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1_000_000, Math.max(1, Math.round(value)));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Load once on mount, then keep localStorage in sync. This also preserves the
  // enquiry while the customer moves around the site.
  useEffect(() => {
    setLines(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable (private mode) — the cart still works in memory */
    }
  }, [lines, ready]);

  // Keep multiple open tabs consistent.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((productId: string, quantity: number, size: string | null = null) => {
    setLines((current) => {
      const existing = current.find((line) => sameLine(line, productId, size));
      if (existing) {
        return current.map((line) =>
          sameLine(line, productId, size) ? { ...line, quantity: clamp(line.quantity + quantity) } : line,
        );
      }
      return [...current, { productId, size, quantity: clamp(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number, size: string | null = null) => {
    setLines((current) =>
      current.map((line) => (sameLine(line, productId, size) ? { ...line, quantity: clamp(quantity) } : line)),
    );
  }, []);

  const setSizes = useCallback((productId: string, quantities: Record<string, number>) => {
    setLines((current) => {
      // Keep the product where it was in the list, so editing sizes does not
      // shuffle the enquiry page.
      const at = current.findIndex((line) => line.productId === productId && line.size !== null);
      const others = current.filter((line) => !(line.productId === productId && line.size !== null));
      const sized: CartLine[] = Object.entries(quantities)
        .filter(([, quantity]) => Number.isFinite(quantity) && quantity > 0)
        .map(([size, quantity]) => ({ productId, size, quantity: clamp(quantity) }));
      if (at === -1) return [...others, ...sized];
      const insertAt = current.slice(0, at).filter((line) => others.includes(line)).length;
      return [...others.slice(0, insertAt), ...sized, ...others.slice(insertAt)];
    });
  }, []);

  const remove = useCallback((productId: string, size: string | null = null) => {
    setLines((current) => current.filter((line) => !sameLine(line, productId, size)));
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const totals = new Map<string, number>();
    for (const line of lines) totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
    return {
      lines,
      ready,
      totalLines: lines.length,
      totalUnits: lines.reduce((sum, line) => sum + line.quantity, 0),
      quantityOf: (productId: string) => totals.get(productId) ?? 0,
      quantityOfSize: (productId: string, size: string | null) =>
        lines.find((line) => sameLine(line, productId, size))?.quantity ?? 0,
      add,
      setQuantity,
      setSizes,
      remove,
      removeProduct,
      clear,
    };
  }, [lines, ready, add, setQuantity, setSizes, remove, removeProduct, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
