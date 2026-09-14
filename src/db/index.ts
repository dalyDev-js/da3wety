import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";

import * as schema from "./schema";

/**
 * Drizzle over postgres-js, connected to the Supabase *transaction* pooler.
 * - prepare:false — Supavisor transaction mode has no prepared statements.
 * - small pool — every serverless instance holds its own; Supavisor multiplexes.
 * - memoized on globalThis in development so HMR does not leak connections.
 */
function createClient() {
  const sql = postgres(serverEnv().DATABASE_URL, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });
  return drizzle({ client: sql, schema, casing: "snake_case" });
}

type Db = ReturnType<typeof createClient>;

const globalForDb = globalThis as unknown as { __da3wetyDb?: Db };

export const db: Db =
  process.env.NODE_ENV === "production"
    ? createClient()
    : (globalForDb.__da3wetyDb ??= createClient());

export type Database = Db;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
