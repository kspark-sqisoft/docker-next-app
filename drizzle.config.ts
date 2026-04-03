import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url && process.argv.some((a) => a.includes("drizzle-kit"))) {
  console.warn(
    "[drizzle.config] DATABASE_URL 가 없습니다. migrate/generate 시 .env 를 확인하세요.",
  );
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: url ?? "postgresql://localhost:5432/placeholder",
  },
});
