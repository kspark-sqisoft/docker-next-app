import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { PostLikeBar } from "@/components/posts/post-like-bar";
import { postLikes, posts } from "@/drizzle/schema";
import { imageUrlsFromDb } from "@/lib/post-json";
import { db } from "@/lib/db";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, id),
    columns: { title: true },
  });
  return { title: post?.title ?? "글 보기" };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  const [post, userLike] = await Promise.all([
    db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: {
        author: {
          columns: {
            id: true,
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
    }),
    session?.user?.id
      ? db.query.postLikes.findFirst({
          where: and(
            eq(postLikes.postId, id),
            eq(postLikes.userId, session.user.id),
          ),
          columns: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!post) notFound();

  const likeCount = await db.$count(postLikes, eq(postLikes.postId, id));

  const isOwner = session?.user?.id === post.authorId;
  const imageUrls = imageUrlsFromDb(post.imageUrls);
  const likeInitial = {
    likeCount,
    likedByMe: Boolean(userLike),
  };

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

      <Card>
        <CardHeader className="space-y-3 border-b pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-xl leading-snug sm:text-2xl">
                {post.title}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                {post.author?.profileImageUrl ? (
                  <img
                    src={post.author.profileImageUrl}
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : null}
                <span>
                  {new Date(post.createdAt).toLocaleString("ko-KR")}
                  {post.author?.name ? ` · ${post.author.name}` : " · 익명"}
                  {post.updatedAt.getTime() !== post.createdAt.getTime() ? (
                    <span className="block text-[0.7rem] sm:inline sm:before:content-['·']">
                      {" "}
                      수정{" "}
                      {new Date(post.updatedAt).toLocaleString("ko-KR")}
                    </span>
                  ) : null}
                </span>
              </CardDescription>
            </div>
            {isOwner ? (
              <Link
                href={`/posts/${post.id}/edit`}
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "shrink-0 gap-1.5",
                )}
              >
                수정
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <p className="text-card-foreground whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
            {post.content}
          </p>
          {imageUrls.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium">
                첨부 이미지
              </p>
              <ul className="grid gap-3 sm:grid-cols-2">
                {imageUrls.map((src) => (
                  <li
                    key={src}
                    className="overflow-hidden rounded-lg ring-1 ring-border"
                  >
                    <div className="bg-muted/30">
                      <img
                        src={src}
                        alt=""
                        className="max-h-96 w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <PostLikeBar
            postId={post.id}
            initial={likeInitial}
            isLoggedIn={Boolean(session?.user?.id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
