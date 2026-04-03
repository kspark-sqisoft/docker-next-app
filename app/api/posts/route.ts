import { NextResponse } from "next/server";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { auth } from "@/auth";
import { posts, users } from "@/drizzle/schema";
import { serializePost, jsonValueFromUrls } from "@/lib/api-serialize";
import { db } from "@/lib/db";
import { devLog } from "@/lib/dev-log";
import { sanitizeImageUrls } from "@/lib/post-image-urls";
import {
  postCreateBodySchema,
  postListQuerySchema,
} from "@/lib/validations/post";

const authorColumns = {
  id: true,
  name: true,
  email: true,
  profileImageUrl: true,
} as const;

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

  let cursorWhere: ReturnType<typeof or> | undefined;
  if (cursor) {
    const cursorRow = await db.query.posts.findFirst({
      where: eq(posts.id, cursor),
      columns: { id: true, createdAt: true },
    });
    if (!cursorRow) {
      devLog("api:posts", "GET /api/posts: 400 bad cursor", { cursor });
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursorWhere = or(
      lt(posts.createdAt, cursorRow.createdAt),
      and(
        eq(posts.createdAt, cursorRow.createdAt),
        lt(posts.id, cursorRow.id),
      ),
    );
  }

  const pageRows = await db.query.posts.findMany({
    limit: take,
    where: cursorWhere,
    orderBy: [desc(posts.createdAt), desc(posts.id)],
    with: {
      author: { columns: authorColumns },
    },
  });

  const hasNext = pageRows.length > limit;
  const items = hasNext ? pageRows.slice(0, limit) : pageRows;
  const nextCursor = hasNext ? (items[items.length - 1]?.id ?? null) : null;

  devLog("api:posts", "GET /api/posts: ok", {
    returned: items.length,
    hasNext,
  });

  return NextResponse.json({
    items: items.map((p) =>
      serializePost({
        ...p,
        author: p.author ?? null,
      }),
    ),
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

    const [post] = await db
      .insert(posts)
      .values({
        title: parsed.data.title,
        content: parsed.data.content,
        authorId: session.user.id,
        imageUrls: jsonValueFromUrls(urlsResult.urls),
      })
      .returning();

    if (!post) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const author = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: authorColumns,
    });

    devLog("api:posts", "POST /api/posts: 201 created", {
      postId: post.id,
      authorId: session.user.id,
      imageCount: urlsResult.urls.length,
    });
    return NextResponse.json(
      serializePost({
        ...post,
        author: author ?? null,
      }),
      { status: 201 },
    );
  } catch {
    devLog("api:posts", "POST /api/posts: 500 error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
