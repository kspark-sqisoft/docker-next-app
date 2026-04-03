import { Prisma } from "@/app/generated/prisma/client";
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

export function jsonValueFromUrls(urls: string[]): Prisma.InputJsonValue {
  return urls as unknown as Prisma.InputJsonValue;
}
