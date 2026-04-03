import { unlink } from "fs/promises";
import { join } from "path";
import {
  POST_IMAGE_PUBLIC_PREFIX,
  resolveUploadsRoot,
} from "@/lib/uploads";

export const MAX_POST_IMAGES = 5;

export function sanitizeImageUrls(
  raw: unknown,
): { ok: true; urls: string[] } | { ok: false; message: string } {
  if (raw == null) return { ok: true, urls: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: "imageUrls must be an array" };
  }
  if (raw.length > MAX_POST_IMAGES) {
    return {
      ok: false,
      message: `Maximum ${MAX_POST_IMAGES} images allowed`,
    };
  }
  const seen = new Set<string>();
  for (const u of raw) {
    if (typeof u !== "string" || !u.startsWith(POST_IMAGE_PUBLIC_PREFIX)) {
      return { ok: false, message: "Invalid image path" };
    }
    const name = u.slice(POST_IMAGE_PUBLIC_PREFIX.length);
    if (!name || name.includes("..") || name.includes("/")) {
      return { ok: false, message: "Invalid image path" };
    }
    if (seen.has(u)) {
      return { ok: false, message: "Duplicate image path" };
    }
    seen.add(u);
  }
  return { ok: true, urls: [...seen] };
}

export function diskPathForPostImageUrl(url: string): string | null {
  if (!url.startsWith(POST_IMAGE_PUBLIC_PREFIX)) return null;
  const name = url.slice(POST_IMAGE_PUBLIC_PREFIX.length);
  if (!name || name.includes("..") || name.includes("/")) return null;
  return join(resolveUploadsRoot(), "posts", name);
}

export async function unlinkPostImageFile(url: string): Promise<void> {
  const p = diskPathForPostImageUrl(url);
  if (!p) return;
  try {
    await unlink(p);
  } catch {
    /* ignore */
  }
}

export function diskPathForProfileImageUrl(url: string): string | null {
  if (!url.startsWith("/uploads/profiles/")) return null;
  const name = url.slice("/uploads/profiles/".length);
  if (!name || name.includes("..") || name.includes("/")) return null;
  return join(resolveUploadsRoot(), "profiles", name);
}

export async function unlinkProfileImageFile(url: string): Promise<void> {
  const p = diskPathForProfileImageUrl(url);
  if (!p) return;
  try {
    await unlink(p);
  } catch {
    /* ignore */
  }
}
