import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySessionToken } from "./auth";

/**
 * Defence in depth: the middleware already blocks unauthenticated requests, but
 * every server action calls this too so a mutation can never run without a
 * valid session.
 */
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const valid = await verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!valid) redirect("/admin/login");
}
