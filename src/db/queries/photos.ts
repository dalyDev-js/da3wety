import "server-only";

import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { pageNumber } from "@/lib/pagination";
import { photos, type Photo, type PhotoStatus } from "@/db/schema";

export const PHOTO_PAGE_SIZE = 40;

/** Guest-facing: approved and fully uploaded photos, newest first. */
export const listPublicPhotos = cache(async (eventId: string, page = 1): Promise<{ rows: Photo[]; total: number }> => {
  const where = and(eq(photos.eventId, eventId), eq(photos.status, "approved"), eq(photos.uploadState, "stored"));
  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(photos)
      .where(where)
      .orderBy(desc(photos.createdAt))
      .limit(PHOTO_PAGE_SIZE)
      .offset((pageNumber(page) - 1) * PHOTO_PAGE_SIZE),
    db.select({ value: count() }).from(photos).where(where),
  ]);
  return { rows, total: totalRow?.value ?? 0 };
});

/** A guest's own uploads in this browser session (any status), so they see pending ones. */
export const listSessionPhotos = cache(async (eventId: string, uploadSession: string): Promise<Photo[]> => {
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.eventId, eventId), eq(photos.uploadSession, uploadSession), eq(photos.uploadState, "stored")))
    .orderBy(desc(photos.createdAt))
    .limit(100);
});

/** Host-facing list by moderation status. */
export const listPhotosForHost = cache(
  async (eventId: string, status: PhotoStatus | "all", page = 1): Promise<{ rows: Photo[]; total: number }> => {
    const where = and(
      eq(photos.eventId, eventId),
      eq(photos.uploadState, "stored"),
      status === "all" ? undefined : eq(photos.status, status),
    );
    const [rows, [totalRow]] = await Promise.all([
      db
        .select()
        .from(photos)
        .where(where)
        .orderBy(desc(photos.createdAt))
        .limit(PHOTO_PAGE_SIZE)
        .offset((pageNumber(page) - 1) * PHOTO_PAGE_SIZE),
      db.select({ value: count() }).from(photos).where(where),
    ]);
    return { rows, total: totalRow?.value ?? 0 };
  },
);

export const countPhotosForEvent = cache(async (eventId: string): Promise<{ stored: number; pending: number }> => {
  const [row] = await db
    .select({
      stored: sql<number>`count(*) filter (where ${photos.uploadState} = 'stored')`.mapWith(Number),
      pending:
        sql<number>`count(*) filter (where ${photos.uploadState} = 'stored' and ${photos.status} = 'pending')`.mapWith(
          Number,
        ),
    })
    .from(photos)
    .where(eq(photos.eventId, eventId));
  return { stored: row?.stored ?? 0, pending: row?.pending ?? 0 };
});

export async function getPhotosByIds(eventId: string, ids: string[]): Promise<Photo[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.eventId, eventId), inArray(photos.id, ids)));
}

/** Reserved rows whose upload never completed. */
export async function listStaleReservations(olderThan: Date, limit = 200): Promise<Photo[]> {
  return db
    .select()
    .from(photos)
    .where(and(eq(photos.uploadState, "reserved"), lt(photos.createdAt, olderThan)))
    .limit(limit);
}
