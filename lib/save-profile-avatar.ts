import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { extname, join } from "path";
import { eq } from "drizzle-orm";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { unlinkProfileImageFile } from "@/lib/post-image-urls";
import {
  ALLOWED_POST_IMAGE_MIMES,
  ensureUploadDirs,
  MAX_PROFILE_IMAGE_BYTES,
  resolveUploadsRoot,
} from "@/lib/uploads";

export type SaveAvatarResult =
  | { ok: true; profileImageUrl: string }
  | { ok: false; error: string };

/** Route Handler / Server Action 공통 — 프로필 이미지 저장 */
export async function saveProfileAvatar(
  userId: string,
  file: File,
): Promise<SaveAvatarResult> {
  if (!ALLOWED_POST_IMAGE_MIMES.has(file.type)) {
    return { ok: false, error: "jpeg, png, webp, gif 만 업로드할 수 있습니다." };
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return { ok: false, error: "파일 크기는 2MB 이하여야 합니다." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { profileImageUrl: true },
  });
  if (existing?.profileImageUrl?.startsWith("/uploads/profiles/")) {
    await unlinkProfileImageFile(existing.profileImageUrl);
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
          : ".gif");
  const filename = `${randomUUID()}${ext}`;
  const dir = join(resolveUploadsRoot(), "profiles");
  await writeFile(join(dir, filename), buf);

  const url = `/uploads/profiles/${filename}`;
  await db
    .update(users)
    .set({ profileImageUrl: url })
    .where(eq(users.id, userId));

  return { ok: true, profileImageUrl: url };
}
