"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "../logo";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/catalogue", label: "Print PDF" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return null;

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <span className="hidden rounded-md bg-surface-2 px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-muted sm:inline">
            Admin
          </span>
        </div>

        <nav aria-label="Admin" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href) ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-surface-2"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/" target="_blank" className="btn btn-ghost btn-sm">View site</Link>
          <button type="button" onClick={logout} className="btn btn-secondary btn-sm">Log out</button>
        </div>
      </div>
    </header>
  );
}
