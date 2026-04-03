"use client";

import { usePathname } from "next/navigation";

function titleFromPath(pathname: string): string {
  if (pathname === "/posts" || pathname === "/posts/") return "게시판";
  if (pathname === "/posts/new") return "글 작성";
  if (pathname === "/profile") return "프로필";
  if (pathname === "/login") return "로그인";
  if (pathname === "/register") return "회원가입";
  if (pathname === "/" || pathname === "") return "Notice Board";
  if (/^\/posts\/[^/]+\/edit$/.test(pathname)) return "글 수정";
  if (/^\/posts\/[^/]+$/.test(pathname)) return "글 보기";
  return "Notice Board";
}

export function PageTitleHeading() {
  const pathname = usePathname() ?? "";
  const title = titleFromPath(pathname);

  return (
    <h1 className="font-heading text-foreground mb-3 text-lg font-semibold tracking-tight sm:mb-4 sm:text-xl md:text-2xl">
      {title}
    </h1>
  );
}
