import { z } from "zod";

/**
 * Environment access with validation.
 *
 * - `publicEnv` is safe in the browser. Each NEXT_PUBLIC_* variable is referenced
 *   explicitly so Next.js can inline it at build time.
 * - `serverEnv()` is server-only and validated on first use so a missing or renamed
 *   key fails fast with a readable message instead of an undefined at request time.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPPORT_WHATSAPP: z.string().optional(),
});

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

function parsePublic() {
  const result = publicSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPPORT_WHATSAPP: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
  });
  if (!result.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatIssues(result.error)}`,
    );
  }
  return result.data;
}

let publicCache: z.infer<typeof publicSchema> | undefined;
let serverCache: z.infer<typeof serverSchema> | undefined;

export function publicEnv() {
  publicCache ??= parsePublic();
  return publicCache;
}

export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  if (!serverCache) {
    const result = serverSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(
        `Invalid server environment variables:\n${formatIssues(result.error)}`,
      );
    }
    serverCache = result.data;
  }
  return serverCache;
}

export type PublicEnv = ReturnType<typeof publicEnv>;
export type ServerEnv = ReturnType<typeof serverEnv>;
