import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { serverEnv } from "@/lib/env";

import * as schema from "./schema";

/**
 * Drizzle over postgres-js, connected to the Supabase *transaction* pooler.
 * - prepare:false — Supavisor transaction mode has no prepared statements.
 * - small pool — every serverless instance holds its own; Supavisor multiplexes.
 * - created lazily on first use (never at import/build time) and memoized on
 *   globalThis in development so HMR does not leak connections.
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

function getDb(): Db {
  if (process.env.NODE_ENV === "production") {
    globalForDb.__da3wetyDb ??= createClient();
    return globalForDb.__da3wetyDb;
  }
  return (globalForDb.__da3wetyDb ??= createClient());
}

/** Lazy proxy: `db.select()` etc. instantiate the client on first call. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Database = Db;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
