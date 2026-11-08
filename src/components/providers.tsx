"use client";

import { CartProvider } from "./cart-context";
import { ToastProvider } from "./toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  );
}
