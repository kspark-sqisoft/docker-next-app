import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { postLikes, posts } from "@/drizzle/schema";
import { serializePost, jsonValueFromUrls } from "@/lib/api-serialize";
import { db } from "@/lib/db";
import {
  sanitizeImageUrls,
  unlinkPostImageFile,
} from "@/lib/post-image-urls";
import { devLog } from "@/lib/dev-log";
import { imageUrlsFromDb } from "@/lib/post-json";
import { postUpdateBodySchema } from "@/lib/validations/post";

const authorColumns = {
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
    db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: {
        author: { columns: authorColumns },
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

  if (!post) {
    devLog("api:posts/[id]", "GET: 404", { postId: id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const likeCount = await db.$count(postLikes, eq(postLikes.postId, id));

  devLog("api:posts/[id]", "GET: ok", { postId: id });
  return NextResponse.json({
    ...serializePost({
      ...post,
      author: post.author ?? null,
    }),
    likeCount,
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
  const existing = await db.query.posts.findFirst({ where: eq(posts.id, id) });
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

    await db.update(posts).set(data).where(eq(posts.id, id));

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, id),
      with: { author: { columns: authorColumns } },
    });
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    devLog("api:posts/[id]", "PATCH: ok", { postId: id });
    return NextResponse.json(
      serializePost({ ...post, author: post.author ?? null }),
    );
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
  const existing = await db.query.posts.findFirst({ where: eq(posts.id, id) });
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
  await db.delete(posts).where(eq(posts.id, id));
  devLog("api:posts/[id]", "DELETE: ok", { postId: id, removedImages: urls.length });
  return NextResponse.json({ ok: true });
}
