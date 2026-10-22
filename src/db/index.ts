import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

// prepare:false is required for Supabase's transaction pooler (pgbouncer).
const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
