import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { devLog } from "@/lib/dev-log";
import { prisma } from "@/lib/prisma";

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

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    devLog("api:posts/[id]/like", "POST: 404", { postId });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  let likedByMe: boolean;
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    likedByMe = false;
  } else {
    await prisma.postLike.create({ data: { userId, postId } });
    likedByMe = true;
  }

  const likeCount = await prisma.postLike.count({ where: { postId } });
  devLog("api:posts/[id]/like", "POST: ok", { postId, likeCount, likedByMe });

  return NextResponse.json({ likeCount, likedByMe });
}
