"use client";

import Link from "next/link";
import {
  Loader2,
  LogIn,
  LogOut,
  MessageSquareText,
  UserPlus,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const pill =
  "border-border rounded-md border bg-muted/40 px-1.5 py-px text-[0.65rem] font-medium leading-tight text-muted-foreground sm:px-2 sm:py-0.5 sm:text-xs";

function HeaderStackBadges() {
  const isDev = process.env.NODE_ENV === "development";
  const modeLabel = isDev ? "Dev" : "Prod";
  const stackTitle = isDev
    ? "Next.js 개발 서버 · App Router"
    : "프로덕션 빌드 · 배포 환경 기준";

  return (
    <div
      className="flex max-w-full shrink-0 flex-wrap items-center gap-1"
      title={stackTitle}
    >
      <span
        className={
          isDev
            ? "rounded-md border border-amber-500/45 bg-amber-500/12 px-1.5 py-px text-[0.65rem] font-semibold uppercase tracking-wide text-amber-950 dark:text-amber-100 sm:px-2 sm:py-0.5 sm:text-xs"
            : "rounded-md border border-emerald-600/35 bg-emerald-600/10 px-1.5 py-px text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-950 dark:text-emerald-100 sm:px-2 sm:py-0.5 sm:text-xs"
        }
      >
        {modeLabel}
      </span>
      <span className={pill}>Next.js</span>
      <span className={`${pill} hidden sm:inline`}>App Router</span>
      {isDev ? (
        <span className={`${pill} hidden md:inline`} title={stackTitle}>
          :3000
        </span>
      ) : null}
    </div>
  );
}

export function SiteHeaderBar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const ready = status !== "loading";

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <Link
          href="/posts"
          className="text-primary flex min-w-0 max-w-[min(100%,12rem)] items-center gap-1.5 rounded-md py-1 pr-1 transition-opacity hover:opacity-90 sm:max-w-none sm:gap-2"
        >
          <MessageSquareText
            className="size-6 shrink-0 sm:size-7"
            aria-hidden
          />
          <span className="font-heading truncate text-base font-semibold tracking-tight sm:text-lg">
            Notice Board
          </span>
        </Link>
        <HeaderStackBadges />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        {!ready ? (
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs sm:text-sm">
            <Loader2 className="size-3.5 animate-spin sm:size-4" aria-hidden />
            <span className="max-w-20 truncate sm:max-w-none">확인 중…</span>
          </div>
        ) : user ? (
          <>
            <Link
              href="/profile"
              className="hover:bg-accent/60 flex max-w-[min(11rem,48vw)] items-center gap-2 rounded-lg border border-transparent p-0.5 transition-colors hover:border-border sm:max-w-56 sm:p-1"
              aria-label={`프로필 (${user.name ?? ""})`}
              title={user.email ?? undefined}
            >
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="border-border size-8 shrink-0 rounded-full border object-cover sm:size-9"
                />
              ) : (
                <div
                  className="bg-primary/15 text-primary border-border flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium sm:size-9 sm:text-sm"
                  aria-hidden
                >
                  {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs font-medium sm:text-sm">
                  {user.name ?? user.email}
                </p>
                <p className="text-muted-foreground hidden truncate text-[0.65rem] sm:block sm:text-xs">
                  {user.email}
                </p>
              </div>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-0 px-2 sm:h-8 sm:gap-1.5 sm:px-2.5"
              title="로그아웃"
              onClick={() => void signOut({ redirectTo: "/posts" })}
            >
              <LogOut className="size-3.5 sm:size-4" aria-hidden />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              aria-label="로그인"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 gap-1 px-2 text-xs sm:h-8 sm:gap-1.5 sm:px-2.5 sm:text-sm",
              )}
            >
              <LogIn className="size-3.5 sm:size-4" aria-hidden />
              <span className="hidden min-[360px]:inline">로그인</span>
            </Link>
            <Link
              href="/register"
              aria-label="회원가입"
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-8 gap-1 px-2 text-xs sm:h-8 sm:gap-1.5 sm:px-2.5 sm:text-sm",
              )}
            >
              <UserPlus className="size-3.5 sm:size-4" aria-hidden />
              <span className="hidden min-[360px]:inline">가입</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
