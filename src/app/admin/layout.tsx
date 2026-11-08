import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">{children}</main>
    </div>
  );
}
