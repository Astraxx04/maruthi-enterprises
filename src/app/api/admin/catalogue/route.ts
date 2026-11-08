import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCatalogue, listGenerated, listTemplates } from "@/lib/catalogue-build";
import { getCategories } from "@/lib/store";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const optionsSchema = z.object({
  template: z.string().trim().regex(/^[a-z0-9-]+$/i, "Invalid template"),
  category: z.string().trim().max(80).nullable().optional(),
  onlyFeatured: z.boolean().optional(),
  fileName: z.string().trim().max(80).nullable().optional(),
});

export async function GET() {
  const [templates, categories, generated] = await Promise.all([
    listTemplates(),
    getCategories(),
    listGenerated(),
  ]);
  return NextResponse.json({
    ok: true,
    templates,
    categories: categories.map((category) => category.name),
    generated: generated.slice(0, 12),
  });
}

export async function POST(request: Request) {
  // Each build starts a Chrome process, so keep a lid on how often.
  const limited = rateLimit(clientKey(request, "catalogue-build"), 20, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many catalogue builds. Please wait a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = optionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid options" },
      { status: 400 },
    );
  }

  try {
    const result = await buildCatalogue({
      template: parsed.data.template,
      category: parsed.data.category || null,
      onlyFeatured: Boolean(parsed.data.onlyFeatured),
      fileName: parsed.data.fileName || null,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The catalogue could not be generated.";
    console.error("[catalogue] build failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
