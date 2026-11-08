import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminPasswordMatches, createSessionToken } from "@/lib/auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD is not set on the server." },
      { status: 500 },
    );
  }

  // Brute-force protection: 8 attempts per 15 minutes per IP.
  const limited = rateLimit(clientKey(request, "admin-login"), 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Try again in ${Math.ceil(limited.retryAfter / 60)} minute(s).` },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!adminPasswordMatches(password)) {
    // Constant-ish delay so a wrong password is not measurably faster.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
  }

  const session = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
