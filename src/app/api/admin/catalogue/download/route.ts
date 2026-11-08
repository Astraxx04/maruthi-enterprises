import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { resolveOutputFile } from "@/lib/catalogue-build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("file") ?? "";
  const file = resolveOutputFile(name);
  if (!file) {
    return NextResponse.json({ ok: false, error: "File not found" }, { status: 404 });
  }

  const { size } = await stat(file);
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(size),
      // inline so the browser's PDF viewer opens it; the UI offers a download too
      "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
