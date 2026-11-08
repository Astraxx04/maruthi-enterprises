import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase renamed its API keys in 2025: the browser-safe `anon` key became the
 * **publishable** key (`sb_publishable_…`) and `service_role` became a
 * **secret** key (`sb_secret_…`). The old JWT keys still work but Supabase is
 * retiring them at the end of 2026, so both names are accepted here and the
 * new one wins.
 *
 * Each name is written out in full rather than looked up dynamically, because
 * Next.js only inlines NEXT_PUBLIC_* variables it can see literally.
 */
/**
 * The dashboard offers several URLs for a project and it is easy to copy the
 * REST endpoint by mistake. supabase-js appends "/rest/v1" itself, so a URL
 * that already carries it produces a baffling "Invalid path specified in
 * request URL". Trim it rather than let that happen.
 */
export function normaliseSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return value;
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "")
    .replace(/\/auth\/v1$/, "")
    .replace(/\/storage\/v1$/, "");
}

const url = normaliseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseConfigured = Boolean(url && publicKey);

/**
 * Browser-safe client for the public catalogue. Row level security applies, so
 * it can read products and categories and nothing else.
 */
export function getPublicClient(): SupabaseClient | null {
  if (!url || !publicKey) return null;
  return createClient(url, publicKey, { auth: { persistSession: false } });
}

/**
 * Server-side client holding the secret key, which bypasses row level security.
 * Never import this into a client component.
 */
export function getAdminClient(): SupabaseClient | null {
  if (!url || !secretKey) return null;
  return createClient(url, secretKey, { auth: { persistSession: false } });
}

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
