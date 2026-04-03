import { config } from "dotenv";

/**
 * drizzle-kit 이 이 파일을 로드할 때 `import { defineConfig } from "drizzle-kit"` 를 쓰면
 * 프로젝트 node_modules 에 drizzle-kit 이 있어야 합니다.
 * Docker dev 에서 빈 node_modules 볼륨이면 실패하므로, 순수 객체 export 만 사용합니다.
 */
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url && process.argv.some((a) => a.includes("drizzle-kit"))) {
  console.warn(
    "[drizzle.config] DATABASE_URL 가 없습니다. migrate/generate 시 .env 를 확인하세요.",
  );
}

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql" as const,
  dbCredentials: {
    url: url ?? "postgresql://localhost:5432/placeholder",
  },
};
