/**
 * Idempotent seed: package tiers.
 * Run with `npm run db:seed` (uses DATABASE_MIGRATION_URL, the session pooler).
 * Deliberately does not import "@/db" (which is `server-only`) so it runs in plain Node.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { packages } from "./schema/packages";
import { PACKAGE_SEED } from "./seed-data";

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) throw new Error("DATABASE_MIGRATION_URL is not set");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle({ client, casing: "snake_case" });

  try {
    await db
      .insert(packages)
      .values(PACKAGE_SEED)
      .onConflictDoUpdate({
        target: packages.tier,
        set: {
          nameAr: sql`excluded.name_ar`,
          nameEn: sql`excluded.name_en`,
          sortOrder: sql`excluded.sort_order`,
          isActive: sql`excluded.is_active`,
          maxGuests: sql`excluded.max_guests`,
          galleryEnabled: sql`excluded.gallery_enabled`,
          moderationEnabled: sql`excluded.moderation_enabled`,
          maxPhotos: sql`excluded.max_photos`,
          photoRetentionDays: sql`excluded.photo_retention_days`,
          checkinEnabled: sql`excluded.checkin_enabled`,
          updatedAt: sql`now()`,
          // price_egp is intentionally not overwritten: operators set it in the DB.
        },
      });
    console.log(`seeded ${PACKAGE_SEED.length} packages`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
