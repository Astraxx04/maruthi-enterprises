"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine } from "@/lib/types";

const STORAGE_KEY = "maruthi.enquiry.v1";

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  totalLines: number;
  totalUnits: number;
  quantityOf: (productId: string) => number;
  add: (productId: string, quantity: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
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
      .map((line) => ({ productId: line.productId, quantity: clamp(line.quantity) }));
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

  const add = useCallback((productId: string, quantity: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) {
        return current.map((line) =>
          line.productId === productId ? { ...line, quantity: clamp(line.quantity + quantity) } : line,
        );
      }
      return [...current, { productId, quantity: clamp(quantity) }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((current) =>
      current.map((line) => (line.productId === productId ? { ...line, quantity: clamp(quantity) } : line)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const quantities = new Map(lines.map((line) => [line.productId, line.quantity]));
    return {
      lines,
      ready,
      totalLines: lines.length,
      totalUnits: lines.reduce((sum, line) => sum + line.quantity, 0),
      quantityOf: (productId: string) => quantities.get(productId) ?? 0,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
