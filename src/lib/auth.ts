/**
 * Minimal admin session handling.
 *
 * There is no customer authentication anywhere on this site. The admin area is
 * protected by a single shared password (ADMIN_PASSWORD). A successful login
 * sets an HMAC-signed, httpOnly cookie that carries only an expiry timestamp.
 *
 * Uses Web Crypto so the same helpers work in the Edge middleware and in Node
 * route handlers.
 */

export const ADMIN_COOKIE = "me_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_SESSION_SECRET (or ADMIN_PASSWORD) must be set");
  return value;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  view.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(signature);
}

export async function createSessionToken(): Promise<{ value: string; maxAge: number }> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = String(expires);
  return { value: `${payload}.${await sign(payload)}`, maxAge: Math.floor(SESSION_TTL_MS / 1000) };
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return timingSafeEqual(await sign(payload), signature);
}

/** Constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function adminPasswordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(candidate, expected);
}

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);
