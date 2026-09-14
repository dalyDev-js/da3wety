import "server-only";

import { createHash } from "node:crypto";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { rateLimits } from "@/db/schema";

export type RateLimitResult = { ok: boolean; count: number; limit: number };

export class RateLimitedError extends Error {
  constructor(readonly scope: string) {
    super(`Rate limit exceeded for ${scope}`);
    this.name = "RateLimitedError";
  }
}

/**
 * Fixed-window counter in Postgres (one atomic upsert). Good enough for abuse
 * control on public endpoints without an extra service.
 */
export async function consumeRateLimit(opts: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = opts;
  const rows = await db.execute<{ count: number }>(sql`
    insert into ${rateLimits} (key, window_start, count)
    values (${key}, now(), 1)
    on conflict (key) do update set
      count = case
        when ${rateLimits}.window_start < now() - make_interval(secs => ${windowSeconds})
        then 1 else ${rateLimits}.count + 1 end,
      window_start = case
        when ${rateLimits}.window_start < now() - make_interval(secs => ${windowSeconds})
        then now() else ${rateLimits}.window_start end
    returning count
  `);
  const count = Number(rows[0]?.count ?? 0);
  return { ok: count <= limit, count, limit };
}

/** Throws RateLimitedError when exceeded. */
export async function enforceRateLimit(opts: {
  scope: string;
  subject: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const key = `${opts.scope}:${hashSubject(opts.subject)}`;
  const result = await consumeRateLimit({ key, limit: opts.limit, windowSeconds: opts.windowSeconds });
  if (!result.ok) throw new RateLimitedError(opts.scope);
}

export function hashSubject(subject: string): string {
  return createHash("sha256").update(subject).digest("base64url").slice(0, 32);
}

/** Best-effort client IP for rate limiting (Vercel sets x-forwarded-for). */
export async function requestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
