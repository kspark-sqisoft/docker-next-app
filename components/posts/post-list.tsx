"use client";

import { useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Inbox,
  Loader2,
  PenSquare,
} from "lucide-react";
import type { PostsPageJson } from "@/lib/post-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

/** 작게 잡아야 첫 화면에 sentinel 이 안 들어와 스크롤·버튼으로 다음 페이지를 체감하기 쉽습니다. */
const PAGE_LIMIT = 6;

async function fetchPostsPage(
  cursor: string | undefined,
): Promise<PostsPageJson> {
  // 개발: 첫 페이지는 바로, "더 불러오기" 이후 요청만 잠깐 지연해 로딩 문구를 볼 수 있게 함
  if (process.env.NODE_ENV === "development" && cursor !== undefined) {
    await new Promise((r) => setTimeout(r, 500));
  }
  const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/posts?${params.toString()}`);
  if (!res.ok) throw new Error("목록을 불러오지 못했습니다.");
  return res.json();
}

export function PostList() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const ready = status !== "loading";

  const {
    data,
    isPending: listLoading,
    isError: listIsError,
    error: listErrorRaw,
    isFetching: listFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({ pageParam }) => fetchPostsPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((p) => p.items) ?? [];
  const pageCount = data?.pages.length ?? 0;

  const listErrorMessage = listIsError
    ? listErrorRaw instanceof Error
      ? listErrorRaw.message
      : "오류"
    : null;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-heading text-lg font-medium">글 목록</h2>
        <div className="flex flex-wrap items-center gap-2">
          {ready && user ? (
            <Link
              href="/posts/new"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <PenSquare className="size-3.5" aria-hidden />
              글 작성
            </Link>
          ) : ready ? (
            <Link
              href="/login?callbackUrl=/posts/new"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              로그인 후 글 작성
            </Link>
          ) : null}
          {!listLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
              <span>
                {posts.length}건 표시
                {pageCount > 0 ? ` · ${pageCount}번째 묶음까지` : ""}
                {hasNextPage ? " · 아래 카드에서 더 불러오기" : ""}
              </span>
              {listFetching && !isFetchingNextPage ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  동기화
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {listErrorMessage ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>문제가 발생했습니다</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{listErrorMessage}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => refetch()}
            >
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {listLoading ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-1/4" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </CardHeader>
          </Card>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-12 text-center text-sm">
            <Inbox
              className="text-muted-foreground/40 size-10"
              aria-hidden
            />
            <p>아직 글이 없습니다. 글 작성으로 첫 글을 남겨 보세요.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-2 sm:gap-3">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/posts/${p.id}`} className="block">
                  <Card className="transition-colors hover:bg-accent/40">
                    <CardHeader className="py-4">
                      <CardTitle className="text-base leading-snug">
                        {p.title}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-x-2 text-xs">
                        <span>
                          {new Date(p.createdAt).toLocaleString("ko-KR")}
                        </span>
                        {p.author?.name ? (
                          <span>· {p.author.name}</span>
                        ) : (
                          <span>· 익명</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          {hasNextPage ? (
            <Card className="border-dashed bg-muted/20">
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-base font-medium">
                  다음 글이 더 있어요
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  스크롤로는 자동으로 가져오지 않습니다. 아래{" "}
                  <strong className="text-foreground">더 불러오기</strong>를
                  누르면 다음 {PAGE_LIMIT}건이 붙습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-stretch gap-3 pt-0 sm:items-start">
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  className="w-full gap-2 sm:w-auto"
                  disabled={isFetchingNextPage}
                  onClick={loadMore}
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      불러오는 중…
                    </>
                  ) : (
                    "더 불러오기"
                  )}
                </Button>
                <p
                  className="text-muted-foreground text-xs leading-relaxed"
                  role="status"
                  aria-live="polite"
                >
                  {isFetchingNextPage
                    ? "서버에서 다음 묶음을 가져오는 동안 이 문구가 잠시 보입니다."
                    : `지금 ${posts.length}건을 보고 있습니다. 시드를 돌렸다면 여러 번 나눠 불러올 수 있어요.`}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
