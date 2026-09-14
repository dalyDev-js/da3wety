import { sql, type SQL } from "drizzle-orm";
import { timestamp } from "drizzle-orm/pg-core";
import { authUid } from "drizzle-orm/supabase";

/** createdAt / updatedAt columns shared by every table. */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** `(select auth.uid())` — the current Supabase user inside RLS policies. */
export const currentUserId: SQL = authUid;

/**
 * RLS helper: true when the row's event belongs to the signed-in host.
 * Written as raw SQL against public.events to avoid circular schema imports.
 */
export function ownsEvent(eventIdColumn: unknown): SQL {
  return sql`exists (select 1 from public.events e where e.id = ${eventIdColumn} and e.host_id = ${authUid})`;
}
