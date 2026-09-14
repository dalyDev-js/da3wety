import { index, pgPolicy, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { ownsEvent, timestamps } from "./_shared";
import { rsvpStatusEnum } from "./enums";
import { events } from "./events";
import { guests } from "./guests";

/** The current response of a guest; updated in place when they change their mind. */
export const rsvps = pgTable(
  "rsvps",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid()
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum().notNull(),
    /** Seats attending (1..guest.maxSeats); 0 when declined. */
    seats: smallint().notNull().default(1),
    message: text(),
    responseCount: smallint().notNull().default(1),
    respondedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("rsvps_guest_id_key").on(t.guestId),
    index("rsvps_event_status_idx").on(t.eventId, t.status),
    pgPolicy("rsvps_select_host", {
      for: "select",
      to: authenticatedRole,
      using: ownsEvent(t.eventId),
    }),
  ],
).enableRLS();

export type Rsvp = typeof rsvps.$inferSelect;
export type NewRsvp = typeof rsvps.$inferInsert;
