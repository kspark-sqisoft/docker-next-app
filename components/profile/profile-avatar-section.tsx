"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadProfileAvatar } from "@/actions/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_ACCEPT,
} from "@/lib/upload-constants";

type Props = {
  displayName: string;
  profileImageUrl: string | null;
  /** 세션 JWT 갱신 — router.refresh 없이 헤더·이미지만 맞춤 */
  onAvatarSaved: (profileImageUrl: string) => void;
};

export default function ProfileAvatarSection({
  displayName,
  profileImageUrl,
  onAvatarSaved,
}: Props) {
  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadProfileAvatar,
    {},
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPushedUrl = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!avatarState?.success || !avatarState.profileImageUrl) return;
    if (lastPushedUrl.current === avatarState.profileImageUrl) return;
    lastPushedUrl.current = avatarState.profileImageUrl;
    onAvatarSaved(avatarState.profileImageUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [avatarState, onAvatarSaved]);

  function onAvatarPicked(e: ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_PROFILE_IMAGE_BYTES) {
      e.currentTarget.value = "";
      setClientError(
        `파일 크기는 ${MAX_PROFILE_IMAGE_BYTES / (1024 * 1024)}MB 이하여야 합니다.`,
      );
      return;
    }
    e.currentTarget.form?.requestSubmit();
  }

  const serverError = avatarState?.error;
  const showError = clientError ?? serverError;

  return (
    <div className="space-y-3">
      {showError ? (
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>프로필 이미지</AlertTitle>
          <AlertDescription>{showError}</AlertDescription>
        </Alert>
      ) : null}

      <form action={avatarAction} className="contents">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt=""
                width={112}
                height={112}
                className="border-border size-28 rounded-full border object-cover"
              />
            ) : (
              <div
                className="bg-primary/15 text-primary border-border flex size-28 items-center justify-center rounded-full border text-3xl font-medium"
                aria-hidden
              >
                {displayName.slice(0, 1).toUpperCase() || "?"}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              {profileImageUrl
                ? `현재 이미지: ${profileImageUrl}`
                : "등록된 프로필 이미지가 없습니다."}
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent">
              <Camera className="size-4" aria-hidden />
              {avatarPending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    aria-hidden
                  />
                  업로드 중…
                </>
              ) : (
                "이미지 변경"
              )}
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept={PROFILE_IMAGE_ACCEPT}
                className="sr-only"
                disabled={avatarPending}
                onChange={onAvatarPicked}
              />
            </label>
            <p className="text-muted-foreground text-xs">
              JPEG, PNG, WebP, GIF · 최대 2MB · 선택 시 자동 전송(서버 액션)
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
