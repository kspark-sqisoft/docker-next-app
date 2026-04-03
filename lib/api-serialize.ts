import { imageUrlsFromDb } from "@/lib/post-json";

type AuthorSelect = {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
};

type PostWithAuthor = {
  id: string;
  title: string;
  content: string;
  imageUrls: unknown;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: AuthorSelect | null;
};

export function serializePost(post: PostWithAuthor) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    imageUrls: imageUrlsFromDb(post.imageUrls),
    authorId: post.authorId,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author,
  };
}

/** jsonb 컬럼용 — Drizzle 이 JSON 으로 직렬화합니다. */
export function jsonValueFromUrls(urls: string[]): unknown {
  return urls as unknown;
}
