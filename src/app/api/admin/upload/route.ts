import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getAdminClient, STORAGE_BUCKET, supabaseConfigured } from "@/lib/supabase";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/svg+xml", "svg"],
]);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file received" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image must be 5 MB or smaller" }, { status: 400 });
  }
  const extension = ALLOWED.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { ok: false, error: "Use a JPG, PNG, WebP, AVIF or SVG image" },
      { status: 400 },
    );
  }

  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "product";
  const filename = `${base}-${randomUUID().slice(0, 8)}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (supabaseConfigured) {
    const db = getAdminClient();
    if (!db) {
      return NextResponse.json(
        { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured" },
        { status: 500 },
      );
    }
    const { error } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(filename);
    return NextResponse.json({ ok: true, url: data.publicUrl });
  }

  // Local development fallback — writes into public/uploads. A hosted build has
  // a read-only file system, so fail with an explanation instead of a stack trace.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Image uploads need Supabase Storage. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or paste an image URL instead.",
      },
      { status: 500 },
    );
  }

  try {
    const directory = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, filename), buffer);
    return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
  } catch (error) {
    console.error("[upload] local write failed", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Local image storage is not writable. Configure Supabase Storage for uploads in production.",
      },
      { status: 500 },
    );
  }
}
