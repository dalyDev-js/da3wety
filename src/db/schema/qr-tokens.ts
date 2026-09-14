import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { ownsEvent, timestamps } from "./_shared";
import { qrStatusEnum } from "./enums";
import { events } from "./events";
import { guests } from "./guests";

/**
 * Ticket credentials for premium events. Issued when a guest RSVPs "attending";
 * revoked when they decline; re-issued on a later "attending".
 */
export const qrTokens = pgTable(
  "qr_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    guestId: uuid()
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    /** 22-char base64url; the QR encodes https://da3wety.com/q/<token>. */
    token: text().notNull(),
    /** 6-char Crockford base32 for manual entry; unique per event, resolved only via the scanner. */
    shortCode: text().notNull(),
    status: qrStatusEnum().notNull().default("active"),
    issuedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("qr_tokens_token_key").on(t.token),
    uniqueIndex("qr_tokens_event_short_code_key").on(t.eventId, t.shortCode),
    uniqueIndex("qr_tokens_guest_active_key")
      .on(t.guestId)
      .where(sql`${t.status} = 'active'`),
    pgPolicy("qr_tokens_select_host", {
      for: "select",
      to: authenticatedRole,
      using: ownsEvent(t.eventId),
    }),
  ],
).enableRLS();

export type QrToken = typeof qrTokens.$inferSelect;
export type NewQrToken = typeof qrTokens.$inferInsert;
