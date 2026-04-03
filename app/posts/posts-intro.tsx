"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";

export function PostsIntro() {
  const pathname = usePathname() ?? "";
  const showIntro = pathname === "/posts" || pathname === "/posts/";

  if (!showIntro) return null;

  return (
    <>
      <p className="text-muted-foreground text-pretty text-xs leading-relaxed sm:text-sm">
        NextAuth 세션 쿠키, 프로필·게시글 이미지(로컬 저장) — 글 작성은 로그인
        필요, 목록·보기는 공개입니다.
      </p>
      <Separator className="my-4 sm:my-6" />
    </>
  );
}
