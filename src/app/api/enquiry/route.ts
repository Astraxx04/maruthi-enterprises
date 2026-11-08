import { NextResponse } from "next/server";
import { enquirySchema, fieldErrors, firstError } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createEnquiry, getProductsByIds, recentEnquiryExists } from "@/lib/store";
import { notifyEnquiry } from "@/lib/notify";
import type { EnquiryItem } from "@/lib/types";
import { parsePackSizes } from "@/lib/pack-sizes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Idempotency: the client sends a token generated once per page load. */
const seenTokens = new Map<string, number>();
const TOKEN_TTL_MS = 10 * 60 * 1000;
/** Forms completed faster than this are almost always bots. Override for tests. */
const MIN_FILL_MS = Number(process.env.ENQUIRY_MIN_FILL_MS ?? 2500);
/** 64 KB — an enquiry at the 100-product limit is well under 10 KB. */
const MAX_BODY_BYTES = 64 * 1024;
const DUPLICATE_WINDOW_MS = 60 * 1000;

function rememberToken(token: string): boolean {
  const now = Date.now();
  for (const [key, timestamp] of seenTokens) {
    if (now - timestamp > TOKEN_TTL_MS) seenTokens.delete(key);
  }
  if (seenTokens.has(token)) return false;
  seenTokens.set(token, now);
  return true;
}

function bad(error: string, status = 400, fields?: Record<string, string>) {
  return NextResponse.json({ ok: false, error, fields }, { status });
}

export async function POST(request: Request) {
  // 1. Coarse abuse limit on raw requests from one IP.
  const flood = rateLimit(clientKey(request, "enquiry-requests"), 40, 10 * 60 * 1000);
  if (!flood.ok) {
    return bad("Too many requests from this connection. Please try again later.", 429);
  }

  // 2. Read the body, with a hard size cap.
  //
  // Zod 3 can be made to chew through memory validating an oversized array
  // before it checks the array's own .max() — GHSA-mrhx-c7xc-m3w5, fixed only
  // in Zod 4. This endpoint is public, so cap the bytes before anything parses
  // them. A real enquiry with a hundred products is a few KB.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return bad("That enquiry is too large. Please remove some products and try again.", 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return bad("That enquiry is too large. Please remove some products and try again.", 413);
    }
    body = JSON.parse(raw);
  } catch {
    return bad("Invalid request body");
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return bad(firstError(parsed.error), 400, fieldErrors(parsed.error));
  }
  const payload = parsed.data;

  // 3. Spam traps. Both are silent-success from the bot's point of view would
  //    be nicer, but a plain rejection keeps the behaviour easy to debug.
  if (payload.website) return bad("Submission rejected", 400);
  if (payload.started_at) {
    // A negative value means the browser clock is skewed, not that a bot was
    // fast — in that case the honeypot and rate limits still apply.
    const elapsed = Date.now() - payload.started_at;
    if (elapsed >= 0 && elapsed < MIN_FILL_MS) {
      return bad("That was too quick — please review the form and submit again.", 400);
    }
  }

  // 4. Submission limit — only well-formed enquiries count, so a customer
  //    correcting validation errors is never locked out.
  const limited = rateLimit(clientKey(request, "enquiry"), 5, 10 * 60 * 1000);
  if (!limited.ok) {
    return bad(
      `Too many enquiries from this connection. Please try again in ${Math.ceil(limited.retryAfter / 60)} minute(s).`,
      429,
    );
  }

  // 5. Duplicate protection.
  if (!rememberToken(payload.client_token)) {
    return NextResponse.json({ ok: true, duplicate: true, reference: "" });
  }
  if (await recentEnquiryExists(payload.email, DUPLICATE_WINDOW_MS)) {
    return bad("We already received an enquiry from this email a moment ago. Please wait a minute.", 409);
  }

  // 6. Resolve products server-side — never trust names or units from the client.
  const products = await getProductsByIds(payload.items.map((item) => item.product_id));
  if (products.length === 0) {
    return bad("None of the selected products are in the catalogue any more. Please refresh the page.", 400);
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const known = payload.items.filter((item) => byId.has(item.product_id));

  // A chosen size must still be one the product is sold in.
  const staleSize = known.find(
    (item) => item.size && !parsePackSizes(byId.get(item.product_id)!.pack_size).includes(item.size),
  );
  if (staleSize) {
    const product = byId.get(staleSize.product_id)!;
    return bad(
      `${product.name} is no longer available in ${staleSize.size}. Please update that line in your enquiry.`,
      400,
    );
  }

  const items: EnquiryItem[] = known.map((item) => {
    const product = byId.get(item.product_id)!;
    return {
      product_id: product.id,
      name: product.name,
      brand: product.brand,
      // The chosen size when there is one; otherwise every size it comes in.
      pack_size: item.size ?? product.pack_size,
      unit: product.unit,
      quantity: item.quantity,
    };
  });

  if (items.length === 0) return bad("Please add at least one product to the enquiry.", 400);

  // 7. Persist, then notify. Persisting first means an enquiry is never lost if
  //    a notification channel is down.
  let enquiry;
  try {
    enquiry = await createEnquiry({
      company_name: payload.company_name,
      contact_person: payload.contact_person,
      phone: payload.phone,
      email: payload.email,
      remarks: payload.remarks?.trim() ? payload.remarks.trim() : null,
      items,
    });
  } catch (error) {
    console.error("[enquiry] persist failed", error);
    return bad("We could not save your enquiry. Please try again or call us directly.", 500);
  }

  const results = await notifyEnquiry(enquiry);
  const delivered = results.filter((result) => result.ok).map((result) => result.channel);
  if (delivered.length === 0) {
    console.warn(`[enquiry] ${enquiry.id} saved but no channel delivered it`);
  }

  return NextResponse.json({ ok: true, reference: enquiry.id, delivered });
}
