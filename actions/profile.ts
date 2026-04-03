"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { devLog } from "@/lib/dev-log";
import { saveProfileAvatar } from "@/lib/save-profile-avatar";

/** React 19 useActionState 와 함께 쓰는 프로필 이름 변경 */
export type UpdateProfileNameState = {
  error?: string;
  success?: boolean;
  name?: string;
};

const nameSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function updateProfileName(
  _prev: UpdateProfileNameState | undefined,
  formData: FormData,
): Promise<UpdateProfileNameState> {
  devLog("action:profile", "updateProfileName: start");
  const session = await auth();
  if (!session?.user?.id) {
    devLog("action:profile", "updateProfileName: not authenticated");
    return { error: "로그인이 필요합니다." };
  }

  const raw = formData.get("name");
  if (typeof raw !== "string") {
    devLog("action:profile", "updateProfileName: bad name field", {
      userId: session.user.id,
    });
    return { error: "이름을 입력해 주세요." };
  }

  const parsed = nameSchema.safeParse({ name: raw.trim() });
  if (!parsed.success) {
    devLog("action:profile", "updateProfileName: validation", {
      userId: session.user.id,
    });
    return { error: "이름은 1~100자여야 합니다." };
  }

  await db
    .update(users)
    .set({ name: parsed.data.name })
    .where(eq(users.id, session.user.id));

  revalidatePath("/profile");
  revalidatePath("/posts");

  devLog("action:profile", "updateProfileName: ok", {
    userId: session.user.id,
  });
  return { success: true, name: parsed.data.name };
}

/** FormData + 파일 — 서버 액션에서 multipart 업로드 학습용 */
export type UploadProfileAvatarState = {
  error?: string;
  success?: boolean;
  profileImageUrl?: string;
};

export async function uploadProfileAvatar(
  _prev: UploadProfileAvatarState | undefined,
  formData: FormData,
): Promise<UploadProfileAvatarState> {
  devLog("action:profile", "uploadProfileAvatar: start");
  const session = await auth();
  if (!session?.user?.id) {
    devLog("action:profile", "uploadProfileAvatar: not authenticated");
    return { error: "로그인이 필요합니다." };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    devLog("action:profile", "uploadProfileAvatar: no file", {
      userId: session.user.id,
    });
    return { error: "파일을 선택해 주세요." };
  }

  devLog("action:profile", "uploadProfileAvatar: saving", {
    userId: session.user.id,
    fileSize: file.size,
    fileType: file.type,
  });
  const result = await saveProfileAvatar(session.user.id, file);
  if (!result.ok) {
    devLog("action:profile", "uploadProfileAvatar: save failed", {
      userId: session.user.id,
      error: result.error,
    });
    return { error: result.error };
  }

  revalidatePath("/profile");
  revalidatePath("/posts");

  devLog("action:profile", "uploadProfileAvatar: ok", {
    userId: session.user.id,
  });
  return { success: true, profileImageUrl: result.profileImageUrl };
}
