import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { imageUrlsFromDb } from "@/lib/post-json";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { EditPostForm } from "./edit-post-form";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: post ? `글 수정: ${post.title}` : "글 수정" };
}

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/posts/${id}/edit`);
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();
  if (post.authorId !== session.user.id) {
    redirect(`/posts/${id}`);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/posts"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "gap-1 px-0",
        )}
      >
        ← 목록
      </Link>
      <div>
        <p className="text-muted-foreground text-sm">
          첨부를 줄이면 서버에서 해당 파일도 삭제합니다.
        </p>
      </div>
      <EditPostForm
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
        initialImageUrls={imageUrlsFromDb(post.imageUrls)}
      />
    </div>
  );
}
