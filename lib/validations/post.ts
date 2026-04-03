import { z } from "zod";

/** 제목·본문 — Route Handler JSON 과 Server Action FormData 가 같은 상한·trim 규칙을 씁니다. */
export const postTitleField = z.string().trim().min(1).max(200);
export const postContentField = z.string().trim().min(1);

/** POST /api/posts 요청 본문 */
export const postCreateBodySchema = z.object({
  title: postTitleField,
  content: postContentField,
  imageUrls: z.array(z.string()).optional(),
});

export type PostCreateBody = z.infer<typeof postCreateBodySchema>;

/** PATCH /api/posts/[id] 요청 본문 — 최소 한 필드 필요 */
export const postUpdateBodySchema = z
  .object({
    title: postTitleField.optional(),
    content: postContentField.optional(),
    imageUrls: z.array(z.string()).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.content !== undefined ||
      d.imageUrls !== undefined,
    { message: "At least one of title, content, imageUrls is required" },
  );

export type PostUpdateBody = z.infer<typeof postUpdateBodySchema>;

/** createPost / updatePost 의 FormData `title`, `content` */
export const postFormFieldsSchema = z.object({
  title: postTitleField,
  content: postContentField,
});

export type PostFormFields = z.infer<typeof postFormFieldsSchema>;

/** GET /api/posts?cursor=&limit= */
export const postListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z
    .union([z.string(), z.undefined()])
    .transform((v) => {
      if (v === undefined || v === "") return 15;
      const n = Number.parseInt(v, 10);
      if (Number.isNaN(n)) return 15;
      return Math.min(50, Math.max(1, n));
    }),
});

export type PostListQuery = z.infer<typeof postListQuerySchema>;

const imageUrlArraySchema = z.array(z.string());

/**
 * FormData `imageUrlsJson` (JSON 배열 문자열) → URL 문자열 배열.
 * 빈 값·누락은 [].
 */
export function parsePostImageUrlsFromFormJson(
  raw: FormDataEntryValue | null,
):
  | { ok: true; urls: string[] }
  | { ok: false; error: string } {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: true, urls: [] };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "첨부 이미지 데이터가 올바르지 않습니다." };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = imageUrlArraySchema.safeParse(parsed);
    if (!result.success) {
      return { ok: false, error: "첨부 이미지 데이터가 올바르지 않습니다." };
    }
    return { ok: true, urls: result.data };
  } catch {
    return { ok: false, error: "첨부 이미지 데이터가 올바르지 않습니다." };
  }
}
