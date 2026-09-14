import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) {
  throw new Error(
    "DATABASE_MIGRATION_URL is not set. Use the Supabase *session* pooler URL (port 5432) for drizzle-kit.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url },
  // Only manage the public schema; Supabase owns auth/storage/realtime.
  schemaFilter: ["public"],
  // Never try to create/drop Supabase-managed roles.
  entities: { roles: { provider: "supabase" } },
  verbose: true,
  strict: true,
});
