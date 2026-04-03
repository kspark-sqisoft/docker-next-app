import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (value === "" || value === undefined || value === null) return undefined;
  return value;
}

/**
 * 서버(Node) 전용 환경 변수 — Edge·미들웨어에서는 import 하지 마세요.
 * 첫 import 시 한 번 검증하고, 잘못된 값이면 즉시 throw 합니다.
 */
const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL 이 비어 있습니다.")
      .refine(
        (s) => /^postgres(ql)?:\/\//i.test(s),
        "DATABASE_URL 은 postgresql:// 또는 postgres:// 로 시작해야 합니다.",
      ),
    AUTH_SECRET: z.string().min(1, "AUTH_SECRET 이 비어 있습니다."),
    AUTH_URL: z.preprocess(
      emptyToUndefined,
      z.string().url("AUTH_URL 은 유효한 URL 이어야 합니다.").optional(),
    ),
    UPLOADS_DIR: z.preprocess(
      emptyToUndefined,
      z.string().min(1).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && data.AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: "custom",
        message:
          "프로덕션에서는 AUTH_SECRET 이 최소 32자 이상이어야 합니다. (예: openssl rand -base64 32)",
        path: ["AUTH_SECRET"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const flat = result.error.flatten();
    console.error("[env] 서버 환경 변수 검증 실패");
    console.error("fieldErrors:", flat.fieldErrors);
    if (flat.formErrors.length > 0) {
      console.error("formErrors:", flat.formErrors);
    }
    throw new Error(
      "환경 변수가 올바르지 않습니다. .env 와 .env.example 을 확인하세요.",
    );
  }
  return result.data;
}

export const serverEnv: ServerEnv = loadServerEnv();
