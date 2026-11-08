"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error || "Incorrect password");
        return;
      }
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5">
      <label htmlFor="password" className="label">Admin password</label>
      <input
        id="password"
        type="password"
        value={password}
        autoComplete="current-password"
        autoFocus
        onChange={(event) => setPassword(event.target.value)}
        className={`field ${error ? "field-error" : ""}`}
      />
      {error && <p role="alert" className="mt-2 text-xs font-medium text-[#b4253c]">{error}</p>}
      <button type="submit" disabled={busy || password.length === 0} className="btn btn-primary mt-4 w-full">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
