"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useEffect, useState } from "react";
import { createPost } from "@/actions/posts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostImageAttachments } from "@/components/posts/post-image-attachments";

/**
 * 글 등록: 서버 액션 `createPost` + `useActionState`.
 * 이미지 URL 배열은 `imageUrlsJson` 숨은 필드로 전달합니다.
 * 목록 갱신은 `GET /api/posts` 캐시 무효화(`invalidateQueries`)로 유지합니다.
 */
export function NewPostForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageBusy, setImageBusy] = useState(false);

  const [postState, postAction, postPending] = useActionState(createPost, {});

  useEffect(() => {
    if (!postState?.postId) return;
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
    router.push(`/posts/${postState.postId}`);
    router.refresh();
  }, [postState?.postId, queryClient, router]);

  return (
    <form className="space-y-6" action={postAction}>
      <p className="text-muted-foreground text-sm">
        이 폼은 <strong className="text-foreground">서버 액션</strong>(
        <code className="text-foreground">actions/posts.ts</code> 의{" "}
        <code className="text-foreground">createPost</code>)으로 제출합니다.
        동일 도메인 로직은 <code className="text-foreground">POST /api/posts</code>
        에도 있어 REST 클라이언트·비교 학습에 쓸 수 있습니다.
      </p>
      {postState?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{postState.error}</AlertDescription>
        </Alert>
      ) : null}
      <input
        type="hidden"
        name="imageUrlsJson"
        value={JSON.stringify(imageUrls)}
        readOnly
      />
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">내용</Label>
        <Textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={12}
          className="min-h-[200px] resize-y"
        />
      </div>
      <div className="space-y-2">
        <Label>첨부 이미지</Label>
        <PostImageAttachments
          imageUrls={imageUrls}
          onChange={setImageUrls}
          disabled={postPending}
          onBusyChange={setImageBusy}
        />
      </div>
      <Button type="submit" disabled={postPending || imageBusy}>
        {postPending ? "등록 중…" : "등록"}
      </Button>
    </form>
  );
}
