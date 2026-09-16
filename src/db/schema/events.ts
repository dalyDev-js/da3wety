import { sql } from "drizzle-orm";
import { boolean, index, pgPolicy, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { currentUserId, timestamps } from "./_shared";
import { eventStatusEnum, eventTypeEnum, localeEnum, packageTierEnum, rsvpModeEnum, themeIdEnum } from "./enums";
import { packages } from "./packages";
import { profiles } from "./profiles";

export const events = pgTable(
  "events",
  {
    id: uuid().primaryKey().defaultRandom(),
    hostId: uuid()
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** Public link segment: /e/<slug>. */
    slug: text().notNull(),
    packageTier: packageTierEnum()
      .notNull()
      .default("basic")
      .references(() => packages.tier),

    eventType: eventTypeEnum().notNull().default("wedding"),
    title: text().notNull(),
    honoreePrimary: text().notNull(),
    honoreeSecondary: text(),
    familyNames: text(),
    description: text(),

    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }),
    /** IANA zone the host entered the wall-clock times in. */
    timezone: text().notNull().default("Africa/Cairo"),

    venueName: text(),
    venueAddress: text(),
    venueMapsUrl: text(),

    /** Object paths in the public `event-assets` bucket. */
    coverImagePath: text(),
    revealImagePath: text(),
    /** Invitation palette; see components/invitation/invitation-theme.ts. */
    theme: themeIdEnum().notNull().default("ivory"),
    /** Digital gift (نقوط): InstaPay address or wallet number shown with a copy button. */
    giftEnabled: boolean().notNull().default(false),
    giftHandle: text(),
    giftNote: text(),

    locale: localeEnum().notNull().default("ar"),
    status: eventStatusEnum().notNull().default("draft"),

    rsvpMode: rsvpModeEnum().notNull().default("open"),
    rsvpDeadline: timestamp({ withTimezone: true }),
    /** Seats a self-registered guest may claim on the open public link. */
    openRsvpMaxSeats: smallint().notNull().default(2),

    galleryEnabled: boolean().notNull().default(false),
    galleryModeration: boolean().notNull().default(false),
    /** When the cron may purge the gallery; recomputed whenever dates or tier change. */
    galleryExpiresAt: timestamp({ withTimezone: true }),
    /** Cron claim lock; stale after 15 minutes. */
    purgeStartedAt: timestamp({ withTimezone: true }),
    galleryPurgedAt: timestamp({ withTimezone: true }),

    checkinEnabled: boolean().notNull().default(false),
    /** Staff scanner link segment: /scan/<token>. */
    scannerToken: text(),
    scannerTokenRotatedAt: timestamp({ withTimezone: true }),
    scannerTokenExpiresAt: timestamp({ withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    index("events_host_id_idx").on(t.hostId),
    uniqueIndex("events_slug_key").on(t.slug),
    uniqueIndex("events_scanner_token_key").on(t.scannerToken),
    index("events_gallery_expires_idx")
      .on(t.galleryExpiresAt)
      .where(sql`${t.galleryPurgedAt} is null`),
    pgPolicy("events_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.hostId} = ${currentUserId}`,
    }),
  ],
).enableRLS();

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
