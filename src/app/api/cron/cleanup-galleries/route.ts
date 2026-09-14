import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { listStaleReservations } from "@/db/queries/photos";
import { events, photos } from "@/db/schema";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { BUCKETS, purgeEventFolder, removeObjects } from "@/lib/storage";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TIME_BUDGET_MS = 240_000;
const MAX_EVENTS_PER_RUN = 25;
const LOCK_STALE_MINUTES = 15;
const RESERVATION_TTL_HOURS = 2;

/**
 * Daily gallery cleanup (Vercel Cron -> GET). Idempotent and bounded:
 * - claims expired galleries with a lock (purge_started_at) so overlapping runs never
 *   delete the same folder twice
 * - deletes Storage objects before rows (Drizzle cannot cascade into Storage)
 * - stops after the time budget and lets the next run continue
 * - garbage-collects reservations whose upload never completed
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const started = Date.now();
  const summary = { claimed: 0, purged: 0, objectsRemoved: 0, rowsDeleted: 0, staleReservations: 0, errors: 0 };

  const claimed = await db
    .update(events)
    .set({ purgeStartedAt: new Date() })
    .where(
      and(
        isNull(events.galleryPurgedAt),
        lt(events.galleryExpiresAt, new Date()),
        or(
          isNull(events.purgeStartedAt),
          lt(events.purgeStartedAt, sql`now() - make_interval(mins => ${LOCK_STALE_MINUTES})`),
        ),
        sql`${events.id} in (select id from ${events} where ${events.galleryPurgedAt} is null and ${events.galleryExpiresAt} < now() order by ${events.galleryExpiresAt} limit ${MAX_EVENTS_PER_RUN})`,
      ),
    )
    .returning({ id: events.id, slug: events.slug });
  summary.claimed = claimed.length;

  for (const event of claimed) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      log.warn("cron.cleanup", "time budget reached; remaining events continue next run", {
        remaining: claimed.length - summary.purged,
      });
      break;
    }
    try {
      const removed = await purgeEventFolder(BUCKETS.photos, event.id);
      const deleted = await db.delete(photos).where(eq(photos.eventId, event.id)).returning({ id: photos.id });
      await db.update(events).set({ galleryPurgedAt: new Date(), purgeStartedAt: null }).where(eq(events.id, event.id));
      summary.purged++;
      summary.objectsRemoved += removed;
      summary.rowsDeleted += deleted.length;
    } catch (error) {
      summary.errors++;
      log.error("cron.cleanup", "purge failed", { eventId: event.id, error });
      // Release the lock so the next run retries this event.
      await db.update(events).set({ purgeStartedAt: null }).where(eq(events.id, event.id));
    }
  }

  // Reservations older than the TTL: remove any object that did land, then the row.
  const stale = await listStaleReservations(new Date(Date.now() - RESERVATION_TTL_HOURS * 3600_000));
  for (const photo of stale) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    try {
      const paths = [photo.storagePath, photo.thumbPath].filter(Boolean);
      if (paths.length) await removeObjects(BUCKETS.photos, paths);
      await db.delete(photos).where(eq(photos.id, photo.id));
      summary.staleReservations++;
    } catch (error) {
      summary.errors++;
      log.error("cron.cleanup", "stale reservation cleanup failed", { photoId: photo.id, error });
    }
  }

  log.info("cron.cleanup", "run complete", { ...summary, durationMs: Date.now() - started });
  return NextResponse.json({ ok: summary.errors === 0, ...summary });
}
