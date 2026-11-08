/**
 * Pre-flight check before (and after) deploying.
 *
 *   node --env-file=.env.local scripts/check-deploy.mjs
 *
 * Reports what is configured, then actually talks to Supabase: counts the
 * catalogue, confirms the public key can read it but not reach enquiries, and
 * checks the image bucket exists. Nothing is written.
 */
import { createClient } from "@supabase/supabase-js";

const pass = (text) => console.log(`  ✓ ${text}`);
const warn = (text) => console.log(`  ! ${text}`);
const fail = (text) => console.log(`  ✗ ${text}`);

let problems = 0;
const required = (name) => {
  if (process.env[name]) return true;
  fail(`${name} is not set`);
  problems += 1;
  return false;
};

console.log("\nAdmin");
required("ADMIN_PASSWORD");
if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12) {
  warn("ADMIN_PASSWORD is short — use a long random one in production");
}
if (process.env.ADMIN_SESSION_SECRET) pass("ADMIN_SESSION_SECRET is set");
else {
  fail("ADMIN_SESSION_SECRET is not set — generate one with: openssl rand -base64 32");
  problems += 1;
}

console.log("\nSite");
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!siteUrl) {
  fail("NEXT_PUBLIC_SITE_URL is not set — the sitemap and share previews will point at localhost");
  problems += 1;
} else if (siteUrl.includes("localhost")) {
  warn(`NEXT_PUBLIC_SITE_URL is ${siteUrl} — set it to the live domain before going live`);
} else {
  pass(siteUrl);
}

console.log("\nDatabase and image storage");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";

if (!url || !anonKey || !serviceKey) {
  fail("Supabase is not fully configured — the site would fall back to data/catalogue.json,");
  console.log("    which cannot be written to on Netlify. Admin saves and enquiries would fail.");
  problems += 1;
} else {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const categories = await anon.from("categories").select("id", { count: "exact", head: true });
  const products = await anon.from("products").select("id", { count: "exact", head: true });

  if (categories.error || products.error) {
    fail(`cannot read the catalogue: ${(categories.error ?? products.error).message}`);
    console.log("    Has supabase/schema.sql been run, and then `npm run seed`?");
    problems += 1;
  } else {
    pass(`${products.count} products in ${categories.count} categories`);
    if (!products.count) {
      warn("the catalogue is empty — run: npm run seed");
    }
  }

  // The public key must not be able to see enquiries.
  const leak = await anon.from("enquiries").select("id").limit(1);
  if (leak.error || (leak.data ?? []).length === 0) pass("enquiries are not readable with the public key");
  else {
    fail("the public key can read enquiries — re-run the row level security part of supabase/schema.sql");
    problems += 1;
  }

  const enquiries = await admin.from("enquiries").select("id", { count: "exact", head: true });
  if (enquiries.error) {
    fail(`the service role key cannot reach enquiries: ${enquiries.error.message}`);
    problems += 1;
  } else {
    pass(`${enquiries.count} enquiries stored`);
  }

  const buckets = await admin.storage.listBuckets();
  if (buckets.error) {
    warn(`could not list storage buckets: ${buckets.error.message}`);
  } else if (buckets.data.some((item) => item.name === bucket && item.public)) {
    pass(`public image bucket "${bucket}" exists`);
  } else if (buckets.data.some((item) => item.name === bucket)) {
    fail(`bucket "${bucket}" is not public — uploaded images would not load`);
    problems += 1;
  } else {
    fail(`bucket "${bucket}" does not exist — run the storage part of supabase/schema.sql`);
    problems += 1;
  }
}

console.log("\nEnquiry notifications");
const channels = [
  ["email (Resend)", process.env.RESEND_API_KEY && process.env.ENQUIRY_TO_EMAIL],
  ["Telegram", process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID],
  ["webhook", process.env.ENQUIRY_WEBHOOK_URL],
];
const live = channels.filter(([, on]) => on).map(([name]) => name);
if (live.length) pass(`configured: ${live.join(", ")}`);
else {
  fail("no notification channel is configured — enquiries would be stored but nobody told");
  problems += 1;
}
if (process.env.RESEND_API_KEY && !process.env.ENQUIRY_FROM_EMAIL) {
  warn("ENQUIRY_FROM_EMAIL is unset — Resend's test sender will be used until your domain is verified");
}

console.log(
  problems === 0
    ? "\nReady to deploy.\n"
    : `\n${problems} thing(s) to fix before this goes live.\n`,
);
process.exit(problems === 0 ? 0 : 1);
