"use client";

import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileNameSection } from "@/components/profile/profile-name-section";
import { ProfileSectionErrorBoundary } from "@/components/profile/profile-section-error-boundary";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const ProfileAvatarSection = lazy(() => import("@/components/profile/profile-avatar-section"));

function ProfileAvatarFallback() {
  return (
    <div
      className="flex flex-col gap-4 sm:flex-row sm:items-center"
      aria-hidden
    >
      <div className="bg-muted size-28 shrink-0 animate-pulse rounded-full" />
      <div className="space-y-2">
        <div className="bg-muted h-4 w-48 max-w-full animate-pulse rounded" />
        <div className="bg-muted h-9 w-36 animate-pulse rounded-md" />
        <div className="bg-muted h-3 w-56 animate-pulse rounded" />
      </div>
    </div>
  );
}

function ProfileBackToPostsLink() {
  return (
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
  );
}

function ProfileCardDescriptionHeader() {
  return (
    <CardHeader>
      <CardDescription>
        이름은{" "}
        <strong className="text-foreground">서버 액션</strong>(React 19{" "}
        <code className="text-foreground">useActionState</code>)으로 저장하고,
        아바타도 <code className="text-foreground">FormData</code> 서버 액션으로
        올립니다. (REST{" "}
        <code className="text-foreground">/api/profile</code> 는 글·다른
        클라이언트와의 호환용으로 남길 수 있습니다.)
      </CardDescription>
    </CardHeader>
  );
}

type NameColumnProps = {
  email: string;
  sessionName: string;
  onNameSaved: (name: string) => void;
};

/** 프로필 이미지 URL만 바뀔 때 props가 그대로라 이 트리는 리렌더를 건너뜁니다. */
const MemoProfileNameColumn = memo(function MemoProfileNameColumn({
  email,
  sessionName,
  onNameSaved,
}: NameColumnProps) {
  return (
    <>
      <Separator />
      <ProfileSectionErrorBoundary title="이름·이메일 영역">
        <ProfileNameSection
          email={email}
          sessionName={sessionName}
          onNameSaved={onNameSaved}
        />
      </ProfileSectionErrorBoundary>
    </>
  );
});

export function ProfileForm() {
  const { data: session, status, update } = useSession();
  const user = session?.user;

  const updateRef = useRef(update);
  useLayoutEffect(() => {
    updateRef.current = update;
  }, [update]);

  const onAvatarSaved = useCallback((profileImageUrl: string) => {
    void updateRef.current({ profileImageUrl });
  }, []);

  const onNameSaved = useCallback((name: string) => {
    void updateRef.current({ name });
  }, []);

  if (status === "loading") {
    return (
      <p className="text-muted-foreground text-sm">불러오는 중…</p>
    );
  }

  if (!user) return null;

  const email = user.email ?? "";
  const sessionName = user.name ?? "";
  const profileImageUrl = user.profileImageUrl ?? null;

  return (
    <>
      <ProfileBackToPostsLink />

      <Card>
        <ProfileCardDescriptionHeader />
        <CardContent className="space-y-8">
          <ProfileSectionErrorBoundary title="프로필 이미지 영역">
            <Suspense fallback={<ProfileAvatarFallback />}>
              <ProfileAvatarSection
                displayName={sessionName}
                profileImageUrl={profileImageUrl}
                onAvatarSaved={onAvatarSaved}
              />
            </Suspense>
          </ProfileSectionErrorBoundary>

          <MemoProfileNameColumn
            email={email}
            sessionName={sessionName}
            onNameSaved={onNameSaved}
          />
        </CardContent>
      </Card>
    </>
  );
}
