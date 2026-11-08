"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-context";

/**
 * Persistent summary of the enquiry. Stays out of the way on the enquiry page
 * itself, where the full list is already visible.
 */
export function EnquiryBar() {
  const pathname = usePathname();
  const { totalLines, totalUnits, ready } = useCart();

  if (!ready || totalLines === 0 || pathname.startsWith("/enquiry")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-2.5 pl-4 shadow-bar backdrop-blur-md animate-slide-up sm:max-w-lg">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {totalLines} product{totalLines === 1 ? "" : "s"} selected
          </p>
          <p className="truncate text-xs text-muted">{totalUnits.toLocaleString("en-IN")} units requested</p>
        </div>
        <Link href="/enquiry" className="btn btn-primary btn-sm shrink-0">
          View enquiry
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
