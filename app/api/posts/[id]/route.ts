import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serializePost, jsonValueFromUrls } from "@/lib/api-serialize";
import {
  sanitizeImageUrls,
  unlinkPostImageFile,
} from "@/lib/post-image-urls";
import { devLog } from "@/lib/dev-log";
import { imageUrlsFromDb } from "@/lib/post-json";
import { postUpdateBodySchema } from "@/lib/validations/post";
import { prisma } from "@/lib/prisma";

const authorSelect = {
  id: true,
  name: true,
  email: true,
  profileImageUrl: true,
} as const;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  devLog("api:posts/[id]", "GET: start", { postId: id });
  const session = await auth();

  const [post, userLike] = await Promise.all([
    prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: authorSelect },
        _count: { select: { likes: true } },
      },
    }),
    session?.user?.id
      ? prisma.postLike.findUnique({
          where: {
            userId_postId: { userId: session.user.id, postId: id },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!post) {
    devLog("api:posts/[id]", "GET: 404", { postId: id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  devLog("api:posts/[id]", "GET: ok", { postId: id });
  return NextResponse.json({
    ...serializePost(post),
    likeCount: post._count.likes,
    likedByMe: Boolean(userLike),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    devLog("api:posts/[id]", "PATCH: 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  devLog("api:posts/[id]", "PATCH: start", { postId: id, userId: session.user.id });
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    devLog("api:posts/[id]", "PATCH: 404", { postId: id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    devLog("api:posts/[id]", "PATCH: 403 forbidden", { postId: id });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const json = await request.json();
    const parsed = postUpdateBodySchema.safeParse(json);
    if (!parsed.success) {
      devLog("api:posts/[id]", "PATCH: 400 validation", { postId: id });
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data: {
      title?: string;
      content?: string;
      imageUrls?: ReturnType<typeof jsonValueFromUrls>;
    } = {};

    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.content !== undefined) data.content = parsed.data.content;

    if (parsed.data.imageUrls !== undefined) {
      const urlsResult = sanitizeImageUrls(parsed.data.imageUrls);
      if (!urlsResult.ok) {
        return NextResponse.json({ error: urlsResult.message }, { status: 400 });
      }
      const prev = imageUrlsFromDb(existing.imageUrls);
      const removed = prev.filter((u) => !urlsResult.urls.includes(u));
      await Promise.all(removed.map((u) => unlinkPostImageFile(u)));
      data.imageUrls = jsonValueFromUrls(urlsResult.urls);
    }

    const post = await prisma.post.update({
      where: { id },
      data,
      include: { author: { select: authorSelect } },
    });

    devLog("api:posts/[id]", "PATCH: ok", { postId: id });
    return NextResponse.json(serializePost(post));
  } catch {
    devLog("api:posts/[id]", "PATCH: 500", { postId: id });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    devLog("api:posts/[id]", "DELETE: 401");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  devLog("api:posts/[id]", "DELETE: start", { postId: id, userId: session.user.id });
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) {
    devLog("api:posts/[id]", "DELETE: 404", { postId: id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    devLog("api:posts/[id]", "DELETE: 403", { postId: id });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const urls = imageUrlsFromDb(existing.imageUrls);
  await Promise.all(urls.map((u) => unlinkPostImageFile(u)));
  await prisma.post.delete({ where: { id } });
  devLog("api:posts/[id]", "DELETE: ok", { postId: id, removedImages: urls.length });
  return NextResponse.json({ ok: true });
}
