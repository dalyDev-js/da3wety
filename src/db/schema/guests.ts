import { sql } from "drizzle-orm";
import {
  index,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { ownsEvent, timestamps } from "./_shared";
import { guestSourceEnum } from "./enums";
import { events } from "./events";

/** One row per invitation: a person or a family with `maxSeats`. */
export const guests = pgTable(
  "guests",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** E.164 (+20…), null when the host did not enter one. */
    phone: text(),
    /** Personal link segment: /i/<token>. Issued to self-registered guests too. */
    token: text().notNull(),
    source: guestSourceEnum().notNull().default("host"),
    maxSeats: smallint().notNull().default(1),
    /** e.g. groom side / bride side / work friends. */
    groupLabel: text(),
    /** Host-private notes; never rendered to guests. */
    notes: text(),
    inviteSentAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("guests_event_id_idx").on(t.eventId),
    uniqueIndex("guests_token_key").on(t.token),
    uniqueIndex("guests_event_phone_key")
      .on(t.eventId, t.phone)
      .where(sql`${t.phone} is not null`),
    pgPolicy("guests_select_host", {
      for: "select",
      to: authenticatedRole,
      using: ownsEvent(t.eventId),
    }),
  ],
).enableRLS();

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
