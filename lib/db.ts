import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/drizzle/schema";
import { serverEnv } from "@/lib/env/server";

const globalForDb = globalThis as unknown as { pool: Pool | undefined };

function createPool() {
  return new Pool({ connectionString: serverEnv.DATABASE_URL });
}

export const pool = globalForDb.pool ?? createPool();

if (serverEnv.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
