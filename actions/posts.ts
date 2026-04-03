"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { jsonValueFromUrls } from "@/lib/api-serialize";
import { devLog } from "@/lib/dev-log";
import { imageUrlsFromDb } from "@/lib/post-json";
import {
  sanitizeImageUrls,
  unlinkPostImageFile,
} from "@/lib/post-image-urls";
import { prisma } from "@/lib/prisma";
import {
  parsePostImageUrlsFromFormJson,
  postFormFieldsSchema,
} from "@/lib/validations/post";

/**
 * 학습용: 글 등록을 서버 액션으로 처리하는 예시.
 * 첨부 URL 목록은 JSON 문자열 필드 `imageUrlsJson` 로 전달합니다.
 */
export type CreatePostState = {
  error?: string;
  postId?: string;
};

export async function createPost(
  _prev: CreatePostState | undefined,
  formData: FormData,
): Promise<CreatePostState> {
  devLog("action:createPost", "start");
  const session = await auth();
  if (!session?.user?.id) {
    devLog("action:createPost", "abort: not authenticated");
    return { error: "로그인이 필요합니다." };
  }

  const title = formData.get("title");
  const content = formData.get("content");
  const parsedFields = postFormFieldsSchema.safeParse({
    title: typeof title === "string" ? title : "",
    content: typeof content === "string" ? content : "",
  });
  if (!parsedFields.success) {
    devLog("action:createPost", "abort: validation", { userId: session.user.id });
    return { error: "제목과 내용을 확인해 주세요." };
  }

  const imageParsed = parsePostImageUrlsFromFormJson(
    formData.get("imageUrlsJson"),
  );
  if (!imageParsed.ok) {
    devLog("action:createPost", "abort: imageUrlsJson", {
      userId: session.user.id,
    });
    return { error: imageParsed.error };
  }
  const imageUrls = imageParsed.urls;

  const urlsResult = sanitizeImageUrls(imageUrls);
  if (!urlsResult.ok) {
    devLog("action:createPost", "abort: image urls", {
      userId: session.user.id,
      message: urlsResult.message,
    });
    return { error: urlsResult.message };
  }

  const post = await prisma.post.create({
    data: {
      title: parsedFields.data.title,
      content: parsedFields.data.content,
      authorId: session.user.id,
      imageUrls: jsonValueFromUrls(urlsResult.urls),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },
    },
  });

  revalidatePath("/posts");
  revalidatePath(`/posts/${post.id}`);

  devLog("action:createPost", "ok", {
    postId: post.id,
    userId: session.user.id,
    imageCount: urlsResult.urls.length,
  });
  return { postId: post.id };
}

export type UpdatePostState = {
  error?: string;
  success?: boolean;
  postId?: string;
};

export async function updatePost(
  postId: string,
  _prev: UpdatePostState | undefined,
  formData: FormData,
): Promise<UpdatePostState> {
  devLog("action:updatePost", "start", { postId });
  const session = await auth();
  if (!session?.user?.id) {
    devLog("action:updatePost", "abort: not authenticated", { postId });
    return { error: "로그인이 필요합니다." };
  }

  const title = formData.get("title");
  const content = formData.get("content");
  const parsedFields = postFormFieldsSchema.safeParse({
    title: typeof title === "string" ? title : "",
    content: typeof content === "string" ? content : "",
  });
  if (!parsedFields.success) {
    devLog("action:updatePost", "abort: validation", { postId });
    return { error: "제목과 내용을 확인해 주세요." };
  }

  const imageParsed = parsePostImageUrlsFromFormJson(
    formData.get("imageUrlsJson"),
  );
  if (!imageParsed.ok) {
    return { error: imageParsed.error };
  }
  const imageUrls = imageParsed.urls;

  const urlsResult = sanitizeImageUrls(imageUrls);
  if (!urlsResult.ok) {
    devLog("action:updatePost", "abort: image urls", {
      postId,
      message: urlsResult.message,
    });
    return { error: urlsResult.message };
  }

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) {
    devLog("action:updatePost", "abort: not found", { postId });
    return { error: "글을 찾을 수 없습니다." };
  }
  if (existing.authorId !== session.user.id) {
    devLog("action:updatePost", "abort: forbidden", { postId });
    return { error: "수정할 권한이 없습니다." };
  }

  const prevUrls = imageUrlsFromDb(existing.imageUrls);
  const removed = prevUrls.filter((u) => !urlsResult.urls.includes(u));
  await Promise.all(removed.map((u) => unlinkPostImageFile(u)));

  await prisma.post.update({
    where: { id: postId },
    data: {
      title: parsedFields.data.title,
      content: parsedFields.data.content,
      imageUrls: jsonValueFromUrls(urlsResult.urls),
    },
  });

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);
  revalidatePath(`/posts/${postId}/edit`);

  devLog("action:updatePost", "ok", { postId });
  return { success: true, postId };
}

export type DeletePostState = {
  error?: string;
  success?: boolean;
};

export async function deletePost(
  postId: string,
  _prev: DeletePostState | undefined,
  _formData: FormData,
): Promise<DeletePostState> {
  devLog("action:deletePost", "start", { postId });
  const session = await auth();
  if (!session?.user?.id) {
    devLog("action:deletePost", "abort: not authenticated", { postId });
    return { error: "로그인이 필요합니다." };
  }

  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing) {
    devLog("action:deletePost", "abort: not found", { postId });
    return { error: "글을 찾을 수 없습니다." };
  }
  if (existing.authorId !== session.user.id) {
    devLog("action:deletePost", "abort: forbidden", { postId });
    return { error: "삭제할 권한이 없습니다." };
  }

  const urls = imageUrlsFromDb(existing.imageUrls);
  await Promise.all(urls.map((u) => unlinkPostImageFile(u)));
  await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/posts");
  revalidatePath(`/posts/${postId}`);

  devLog("action:deletePost", "ok", { postId, removedImages: urls.length });
  return { success: true };
}
