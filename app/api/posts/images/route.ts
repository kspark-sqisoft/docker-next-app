import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { devLog } from "@/lib/dev-log";
import {
  ALLOWED_POST_IMAGE_MIMES,
  ensureUploadDirs,
  MAX_POST_IMAGE_BYTES,
  POST_IMAGE_PUBLIC_PREFIX,
  resolveUploadsRoot,
} from "@/lib/uploads";

export async function POST(request: Request) {
  devLog("api:posts/images", "POST: start");
  const session = await auth();
  if (!session?.user?.id) {
    devLog("api:posts/images", "POST: 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    devLog("api:posts/images", "POST: 400 no file", { userId: session.user.id });
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (!ALLOWED_POST_IMAGE_MIMES.has(file.type)) {
    devLog("api:posts/images", "POST: 400 mime", {
      userId: session.user.id,
      type: file.type,
    });
    return NextResponse.json(
      { error: "Only jpeg, png, webp, gif allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_POST_IMAGE_BYTES) {
    devLog("api:posts/images", "POST: 400 size", {
      userId: session.user.id,
      size: file.size,
    });
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  await ensureUploadDirs();
  const buf = Buffer.from(await file.arrayBuffer());
  const ext =
    extname(file.name || "").toLowerCase() ||
    (file.type === "image/jpeg"
      ? ".jpg"
      : file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : file.type === "image/gif"
            ? ".gif"
            : ".bin");
  const filename = `${randomUUID()}${ext}`;
  const dir = join(resolveUploadsRoot(), "posts");
  await writeFile(join(dir, filename), buf);

  const url = `${POST_IMAGE_PUBLIC_PREFIX}${filename}`;
  devLog("api:posts/images", "POST: ok", { userId: session.user.id, url });
  return NextResponse.json({ url });
}
