"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/** 로그인·회원가입: 이미 로그인이면 게시판으로 */
export function AuthSessionGate({ children }: Props) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/posts");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          세션 확인 중…
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return children;
}
