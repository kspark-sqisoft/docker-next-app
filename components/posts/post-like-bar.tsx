"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PostLikeState = { likeCount: number; likedByMe: boolean };

type Props = {
  postId: string;
  initial: PostLikeState;
  isLoggedIn: boolean;
};

/**
 * TanStack Query 낙관적 업데이트 학습용:
 * `onMutate`에서 캐시를 먼저 바꾸고, 실패 시 `onError`에서 스냅샷 복구,
 * 성공 시 서버 응답으로 `onSuccess`에서 캐시를 확정합니다.
 */
export function PostLikeBar({ postId, initial, isLoggedIn }: Props) {
  const queryClient = useQueryClient();
  const qk = ["post", postId, "likes"] as const;

  const { data } = useQuery({
    queryKey: qk,
    queryFn: async (): Promise<PostLikeState> => {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) throw new Error("Failed to load post");
      const j: unknown = await res.json();
      if (typeof j !== "object" || j === null) throw new Error("Invalid JSON");
      const o = j as Record<string, unknown>;
      const likeCount = typeof o.likeCount === "number" ? o.likeCount : 0;
      const likedByMe = Boolean(o.likedByMe);
      return { likeCount, likedByMe };
    },
    initialData: initial,
  });

  const mutation = useMutation({
    mutationFn: async (): Promise<PostLikeState> => {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err === "object" && err !== null && "error" in err
            ? String((err as { error?: string }).error)
            : "toggle failed",
        );
      }
      return res.json() as Promise<PostLikeState>;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: qk });
      const previous = queryClient.getQueryData<PostLikeState>(qk);
      if (!previous) return {};
      const next: PostLikeState = {
        likeCount: previous.likedByMe
          ? Math.max(0, previous.likeCount - 1)
          : previous.likeCount + 1,
        likedByMe: !previous.likedByMe,
      };
      queryClient.setQueryData(qk, next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(qk, context.previous);
      }
    },
    onSuccess: (server) => {
      queryClient.setQueryData(qk, server);
    },
  });

  const likeCount = data?.likeCount ?? 0;
  const likedByMe = data?.likedByMe ?? false;

  return (
    <div className="flex flex-wrap items-center gap-3 border-t pt-4">
      {isLoggedIn ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          aria-pressed={likedByMe}
          aria-label={likedByMe ? "좋아요 취소" : "좋아요"}
        >
          <Heart
            className={cn(
              "size-5 transition-colors",
              likedByMe
                ? "fill-primary text-primary"
                : "text-muted-foreground",
            )}
          />
          {likedByMe ? "좋아요 취소" : "좋아요"}
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            로그인
          </Link>
          하면 좋아요를 누를 수 있습니다.
        </p>
      )}
      <span className="text-muted-foreground text-sm tabular-nums">
        {likeCount}명이 좋아합니다
      </span>
    </div>
  );
}
