import { sql } from "drizzle-orm";
import { boolean, integer, pgPolicy, pgTable, smallint, text } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { timestamps } from "./_shared";
import { packageTierEnum } from "./enums";

/**
 * Package tiers: source of truth for pricing display and feature gating.
 * Seeded by `src/db/seed.ts`; edited by operators in the database, not the app.
 */
export const packages = pgTable(
  "packages",
  {
    tier: packageTierEnum().primaryKey(),
    nameAr: text().notNull(),
    nameEn: text().notNull(),
    priceEgp: integer().notNull().default(0),
    sortOrder: smallint().notNull().default(0),
    isActive: boolean().notNull().default(true),
    /** null = unlimited. Counts host-added and self-registered guests. */
    maxGuests: integer(),
    galleryEnabled: boolean().notNull().default(false),
    moderationEnabled: boolean().notNull().default(false),
    maxPhotos: integer().notNull().default(0),
    photoRetentionDays: smallint().notNull().default(7),
    checkinEnabled: boolean().notNull().default(false),
    ...timestamps,
  },
  () => [
    pgPolicy("packages_select_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
).enableRLS();

export type Package = typeof packages.$inferSelect;
