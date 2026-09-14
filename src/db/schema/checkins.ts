import { index, pgPolicy, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { ownsEvent } from "./_shared";
import { checkinMethodEnum } from "./enums";
import { events } from "./events";
import { guests } from "./guests";
import { qrTokens } from "./qr-tokens";

/** Append-only door log. A party may be admitted in several batches. */
export const checkins = pgTable(
  "checkins",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid()
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    qrTokenId: uuid().references(() => qrTokens.id, { onDelete: "set null" }),
    method: checkinMethodEnum().notNull(),
    seatsAdmitted: smallint().notNull().default(1),
    /** Free-text staff name captured on the scanner page. */
    scannedBy: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("checkins_event_guest_idx").on(t.eventId, t.guestId),
    index("checkins_event_created_idx").on(t.eventId, t.createdAt),
    pgPolicy("checkins_select_host", {
      for: "select",
      to: authenticatedRole,
      using: ownsEvent(t.eventId),
    }),
  ],
).enableRLS();

export type Checkin = typeof checkins.$inferSelect;
export type NewCheckin = typeof checkins.$inferInsert;
