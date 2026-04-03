import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serializePost, jsonValueFromUrls } from "@/lib/api-serialize";
import { devLog } from "@/lib/dev-log";
import { sanitizeImageUrls } from "@/lib/post-image-urls";
import {
  postCreateBodySchema,
  postListQuerySchema,
} from "@/lib/validations/post";
import { prisma } from "@/lib/prisma";

const authorSelect = {
  id: true,
  name: true,
  email: true,
  profileImageUrl: true,
} as const;

/** 목록 정렬과 커서가 일치해야 함: 최신순, id 내림차순으로 안정화 */
const listOrderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = postListQuerySchema.safeParse({
    cursor: url.searchParams.get("cursor") || undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    devLog("api:posts", "GET /api/posts: 400 query", {});
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { cursor, limit } = parsed.data;
  const take = limit + 1;

  devLog("api:posts", "GET /api/posts: page", { cursor: cursor ?? null, limit });

  if (cursor) {
    const cursorRow = await prisma.post.findUnique({
      where: { id: cursor },
      select: { id: true },
    });
    if (!cursorRow) {
      devLog("api:posts", "GET /api/posts: 400 bad cursor", { cursor });
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
  }

  const posts = await prisma.post.findMany({
    take,
    ...(cursor
      ? { skip: 1, cursor: { id: cursor } }
      : {}),
    orderBy: listOrderBy,
    include: { author: { select: authorSelect } },
  });

  const hasNext = posts.length > limit;
  const pageRows = hasNext ? posts.slice(0, limit) : posts;
  const nextCursor = hasNext ? pageRows[pageRows.length - 1]?.id ?? null : null;

  devLog("api:posts", "GET /api/posts: ok", {
    returned: pageRows.length,
    hasNext,
  });

  return NextResponse.json({
    items: pageRows.map((p) => serializePost(p)),
    nextCursor,
  });
}

export async function POST(request: Request) {
  devLog("api:posts", "POST /api/posts: start");
  const session = await auth();
  if (!session?.user?.id) {
    devLog("api:posts", "POST /api/posts: 401 unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = postCreateBodySchema.safeParse(json);
    if (!parsed.success) {
      devLog("api:posts", "POST /api/posts: 400 validation");
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const urlsResult = sanitizeImageUrls(parsed.data.imageUrls ?? []);
    if (!urlsResult.ok) {
      devLog("api:posts", "POST /api/posts: 400 image urls", {
        message: urlsResult.message,
      });
      return NextResponse.json({ error: urlsResult.message }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        authorId: session.user.id,
        imageUrls: jsonValueFromUrls(urlsResult.urls),
      },
      include: { author: { select: authorSelect } },
    });

    devLog("api:posts", "POST /api/posts: 201 created", {
      postId: post.id,
      authorId: session.user.id,
      imageCount: urlsResult.urls.length,
    });
    return NextResponse.json(serializePost(post), { status: 201 });
  } catch {
    devLog("api:posts", "POST /api/posts: 500 error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
