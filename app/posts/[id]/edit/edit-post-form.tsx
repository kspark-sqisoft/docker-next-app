"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useEffect, useState } from "react";
import { deletePost, updatePost } from "@/actions/posts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostImageAttachments } from "@/components/posts/post-image-attachments";

type Props = {
  postId: string;
  initialTitle: string;
  initialContent: string;
  initialImageUrls: string[];
};

export function EditPostForm({
  postId,
  initialTitle,
  initialContent,
  initialImageUrls,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageUrls, setImageUrls] = useState(initialImageUrls);
  const [imageBusy, setImageBusy] = useState(false);

  const [updateState, updateAction, updatePending] = useActionState(
    updatePost.bind(null, postId),
    {},
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deletePost.bind(null, postId),
    {},
  );

  useEffect(() => {
    if (!updateState?.success || !updateState.postId) return;
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
    router.push(`/posts/${updateState.postId}`);
    router.refresh();
  }, [updateState?.success, updateState?.postId, queryClient, router]);

  useEffect(() => {
    if (!deleteState?.success) return;
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
    router.push("/posts");
    router.refresh();
  }, [deleteState?.success, queryClient, router]);

  const busy = updatePending || deletePending;
  const err = updateState?.error ?? deleteState?.error;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        저장·삭제는 <strong className="text-foreground">서버 액션</strong>(
        <code className="text-foreground">updatePost</code>,{" "}
        <code className="text-foreground">deletePost</code>)으로 처리합니다.{" "}
        <code className="text-foreground">PATCH /api/posts/[id]</code> 는 그대로 두어
        REST 클라이언트용으로 쓸 수 있습니다.
      </p>
      {err ? (
        <Alert variant="destructive">
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}
      <form action={updateAction} className="space-y-6">
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
            disabled={busy}
            onBusyChange={setImageBusy}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy || imageBusy}>
            {updatePending ? "저장 중…" : "저장"}
          </Button>
        </div>
      </form>

      <form action={deleteAction}>
        <Button
          type="submit"
          variant="destructive"
          disabled={busy || imageBusy}
          onClick={(e) => {
            if (
              !confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")
            ) {
              e.preventDefault();
            }
          }}
        >
          {deletePending ? "삭제 중…" : "삭제"}
        </Button>
      </form>
    </div>
  );
}
