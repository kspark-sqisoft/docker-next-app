import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { serverEnv } from "@/lib/env/server";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({ connectionString: serverEnv.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function prismaClientIsComplete(client: unknown): client is PrismaClient {
  const c = client as {
    post?: { findUnique?: unknown };
    postLike?: { findUnique?: unknown };
    user?: { findUnique?: unknown };
  };
  return (
    typeof c.post?.findUnique === "function" &&
    typeof c.postLike?.findUnique === "function" &&
    typeof c.user?.findUnique === "function"
  );
}

/**
 * Turbopack/HMR로 `lib/prisma` 모듈이 두 벌 로드되면, 한쪽은 예전 `PrismaClient` 참조를 쥔 채로 남을 수 있습니다.
 * `globalThis`만 갱신해도 이미 export된 인스턴스는 안 바뀌므로, 매 접근마다 global을 보고 완전한 클라이언트를 돌려줍니다.
 */
function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && prismaClientIsComplete(cached)) {
    return cached;
  }
  if (cached) {
    const stale = cached as PrismaClient;
    void stale.$disconnect().catch(() => {});
  }
  const client = createPrismaClient();
  if (serverEnv.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver) as unknown;
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
