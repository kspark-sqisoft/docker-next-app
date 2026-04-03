import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { extname, join } from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { resolveUploadsRoot } from "@/lib/uploads";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(_request: Request, context: Ctx) {
  const { path: segments } = await context.params;
  if (!segments || segments.length !== 2) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [kind, filename] = segments;
  if (kind !== "posts" && kind !== "profiles") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const root = resolveUploadsRoot();
  const fullPath = join(root, kind, filename);

  try {
    const st = await stat(fullPath);
    if (!st.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const ext = extname(filename).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    const stream = createReadStream(fullPath);
    const web = Readable.toWeb(stream);
    return new Response(web as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(st.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
