import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { postLikes, posts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { devLog } from "@/lib/dev-log";

type RouteContext = { params: Promise<{ id: string }> };

/** 로그인 사용자만 — 이미 눌렀으면 취소, 아니면 추가 (토글) */
export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    devLog("api:posts/[id]/like", "POST: 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await context.params;
  const userId = session.user.id;
  devLog("api:posts/[id]/like", "POST: start", { postId, userId });

  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) {
    devLog("api:posts/[id]/like", "POST: 404", { postId });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await db.query.postLikes.findFirst({
    where: and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)),
  });

  let likedByMe: boolean;
  if (existing) {
    await db.delete(postLikes).where(eq(postLikes.id, existing.id));
    likedByMe = false;
  } else {
    await db.insert(postLikes).values({ userId, postId });
    likedByMe = true;
  }

  const likeCount = await db.$count(postLikes, eq(postLikes.postId, postId));
  devLog("api:posts/[id]/like", "POST: ok", { postId, likeCount, likedByMe });

  return NextResponse.json({ likeCount, likedByMe });
}
