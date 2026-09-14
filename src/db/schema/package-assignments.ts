import { index, integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { ownsEvent } from "./_shared";
import { packageTierEnum } from "./enums";
import { events } from "./events";
import { profiles } from "./profiles";

/** Audit trail of manual package sales/assignments made by admins. */
export const packageAssignments = pgTable(
  "package_assignments",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    tier: packageTierEnum().notNull(),
    assignedBy: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    amountEgp: integer(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("package_assignments_event_idx").on(t.eventId),
    pgPolicy("package_assignments_select_host", {
      for: "select",
      to: authenticatedRole,
      using: ownsEvent(t.eventId),
    }),
  ],
).enableRLS();

export type PackageAssignment = typeof packageAssignments.$inferSelect;
