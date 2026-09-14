import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Fixed-window counters for public endpoints (open RSVP, uploads, check-in).
 * Keys look like `rsvp:ip:<sha256>` or `upload:event:<id>`; see lib/rate-limit.ts.
 * No policies: this table is internal and RLS (enabled, deny-all) hides it from PostgREST.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
  count: integer().notNull().default(0),
}).enableRLS();
