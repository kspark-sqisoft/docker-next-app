"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Loader2 } from "lucide-react";
import {
  updateProfileName,
  uploadProfileAvatar,
} from "@/actions/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export function ProfileForm() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const user = session?.user;

  const [name, setName] = useState("");
  const [nameState, nameAction, namePending] = useActionState(
    updateProfileName,
    {},
  );

  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadProfileAvatar,
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) setName(user.name ?? "");
  }, [user, user?.name]);

  useEffect(() => {
    if (nameState?.success && nameState.name) {
      void update({ name: nameState.name });
      router.refresh();
    }
  }, [nameState, update, router]);

  useEffect(() => {
    if (avatarState?.success && avatarState.profileImageUrl) {
      void update({ profileImageUrl: avatarState.profileImageUrl });
      router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [avatarState, update, router]);

  function onAvatarPicked(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      e.currentTarget.form?.requestSubmit();
    }
  }

  if (status === "loading") {
    return (
      <p className="text-muted-foreground text-sm">불러오는 중…</p>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="mb-6">
        <Link
          href="/posts"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1 px-0",
          )}
        >
          ← 게시판으로
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            이름은{" "}
            <strong className="text-foreground">서버 액션</strong>(React 19{" "}
            <code className="text-foreground">useActionState</code>)으로 저장하고,
            아바타도 <code className="text-foreground">FormData</code> 서버
            액션으로 올립니다. (REST{" "}
            <code className="text-foreground">/api/profile</code> 는 글·다른
            클라이언트와의 호환용으로 남길 수 있습니다.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {avatarState?.error ? (
            <Alert variant="destructive">
              <AlertTitle>이미지</AlertTitle>
              <AlertDescription>{avatarState.error}</AlertDescription>
            </Alert>
          ) : null}

          <form action={avatarAction} className="contents">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="shrink-0">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt=""
                    className="border-border size-28 rounded-full border object-cover"
                  />
                ) : (
                  <div
                    className="bg-primary/15 text-primary border-border flex size-28 items-center justify-center rounded-full border text-3xl font-medium"
                    aria-hidden
                  >
                    {user.name?.slice(0, 1).toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  {user.profileImageUrl
                    ? `현재 이미지: ${user.profileImageUrl}`
                    : "등록된 프로필 이미지가 없습니다."}
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent">
                  <Camera className="size-4" aria-hidden />
                  {avatarPending ? "업로드 중…" : "이미지 변경"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
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

          <Separator />

          <div className="space-y-2">
            <Label>이메일</Label>
            <Input
              value={user.email ?? ""}
              disabled
              readOnly
              className="bg-muted/50"
            />
          </div>

          <form action={nameAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">이름</Label>
              <Input
                id="profile-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
              />
            </div>
            {nameState?.error ? (
              <p className="text-destructive text-sm">{nameState.error}</p>
            ) : null}
            {nameState?.success ? (
              <p className="text-muted-foreground text-sm">저장되었습니다.</p>
            ) : null}
            <Button
              type="submit"
              className="gap-2"
              disabled={namePending || name.trim() === (user.name ?? "")}
            >
              {namePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  저장 중…
                </>
              ) : (
                "이름 저장"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
