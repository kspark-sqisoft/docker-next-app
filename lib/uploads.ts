import { mkdir } from "fs/promises";
import { join } from "path";
import { serverEnv } from "@/lib/env/server";
import { MAX_PROFILE_IMAGE_BYTES as MAX_PROFILE_IMAGE_BYTES_SHARED } from "@/lib/upload-constants";

export const POST_IMAGE_PUBLIC_PREFIX = "/uploads/posts/";
export const PROFILE_IMAGE_PUBLIC_PREFIX = "/uploads/profiles/";

export const ALLOWED_POST_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_BYTES = MAX_PROFILE_IMAGE_BYTES_SHARED;

export function resolveUploadsRoot(): string {
  return serverEnv.UPLOADS_DIR ?? join(process.cwd(), "uploads");
}

export async function ensureUploadDirs(): Promise<void> {
  const root = resolveUploadsRoot();
  await mkdir(join(root, "posts"), { recursive: true });
  await mkdir(join(root, "profiles"), { recursive: true });
}
