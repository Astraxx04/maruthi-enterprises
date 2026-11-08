import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center"><Logo /></div>
        <div className="mt-7 rounded-xl2 border border-line bg-white p-7 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">Enter the admin password to manage the catalogue.</p>
          <LoginForm next={next ?? "/admin"} />
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          Customers never see this page. It is protected by a single shared password.
        </p>
      </div>
    </div>
  );
}
