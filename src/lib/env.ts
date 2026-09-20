import { z } from "zod";
import { publicEnv } from "./public-env";
export { publicEnv } from "./public-env";

/**
 * Environment access with validation.
 *
 * - `publicEnv` is safe in the browser. Each NEXT_PUBLIC_* variable is referenced
 *   explicitly so Next.js can inline it at build time.
 * - `serverEnv()` is server-only and validated on first use so a missing or renamed
 *   key fails fast with a readable message instead of an undefined at request time.
 */

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  CRON_SECRET: z.string().min(16),
  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  DEV_LOGIN_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function formatIssues(error: z.ZodError): string {
  return z
    .prettifyError(error)
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n");
}

let serverCache: z.infer<typeof serverSchema> | undefined;

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  if (!serverCache) {
    const result = serverSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`Invalid server environment variables:\n${formatIssues(result.error)}`);
    }
    serverCache = result.data;
  }
  return serverCache;
}

export type PublicEnv = ReturnType<typeof publicEnv>;
export type ServerEnv = ReturnType<typeof serverEnv>;
