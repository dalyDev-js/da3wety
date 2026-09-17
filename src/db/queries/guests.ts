import "server-only";

import { and, asc, count, desc, eq, ilike, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { guests, rsvps, type Guest, type Rsvp } from "@/db/schema";

export type GuestRow = { guest: Guest; rsvp: Rsvp | null };

export type GuestFilter = "all" | "attending" | "declined" | "pending";

export type GuestListParams = {
  eventId: string;
  q?: string;
  filter?: GuestFilter;
  page?: number;
  pageSize?: number;
};

export type GuestListResult = {
  rows: GuestRow[];
  total: number;
  page: number;
  pageSize: number;
};

function filterClause(filter: GuestFilter): SQL | undefined {
  switch (filter) {
    case "attending":
      return eq(rsvps.status, "attending");
    case "declined":
      return eq(rsvps.status, "declined");
    case "pending":
      return isNull(rsvps.id);
    default:
      return undefined;
  }
}

/** Paginated, searchable guest list for the host dashboard. */
export const listGuests = cache(async (params: GuestListParams): Promise<GuestListResult> => {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 50));
  const q = params.q?.trim();

  const where = and(
    eq(guests.eventId, params.eventId),
    q ? or(ilike(guests.name, `%${q}%`), ilike(guests.phone, `%${q}%`), ilike(guests.groupLabel, `%${q}%`)) : undefined,
    filterClause(params.filter ?? "all"),
  );

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({ guest: guests, rsvp: rsvps })
      .from(guests)
      .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
      .where(where)
      .orderBy(desc(guests.createdAt), asc(guests.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(guests).leftJoin(rsvps, eq(rsvps.guestId, guests.id)).where(where),
  ]);

  return { rows, total: totalRow?.value ?? 0, page, pageSize };
});

export const getGuestForEvent = cache(async (guestId: string, eventId: string): Promise<GuestRow | null> => {
  const [row] = await db
    .select({ guest: guests, rsvp: rsvps })
    .from(guests)
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
    .limit(1);
  return row ?? null;
});

export const getRsvpForGuest = cache(async (guestId: string): Promise<Rsvp | null> => {
  const [row] = await db.select().from(rsvps).where(eq(rsvps.guestId, guestId)).limit(1);
  return row ?? null;
});

export type Wish = { guestName: string; status: Rsvp["status"]; message: string; respondedAt: Date };

/** RSVP messages for the host's wishes wall, newest first. */
export const listWishes = cache(
  async (eventId: string, page = 1, pageSize = 50): Promise<{ items: Wish[]; total: number }> => {
    const where = and(eq(rsvps.eventId, eventId), isNotNull(rsvps.message), ne(rsvps.message, ""));
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          guestName: guests.name,
          status: rsvps.status,
          message: rsvps.message,
          respondedAt: rsvps.respondedAt,
        })
        .from(rsvps)
        .innerJoin(guests, eq(guests.id, rsvps.guestId))
        .where(where)
        .orderBy(desc(rsvps.respondedAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(rsvps).where(where),
    ]);
    return { items: rows.map((r) => ({ ...r, message: r.message ?? "" })), total };
  },
);

/** Door-staff search: event-scoped, minimum 3 characters, capped results. */
export async function searchGuestsForScanner(eventId: string, term: string, limit = 5): Promise<GuestRow[]> {
  const q = term.trim();
  if (q.length < 3) return [];
  return db
    .select({ guest: guests, rsvp: rsvps })
    .from(guests)
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .where(
      and(
        eq(guests.eventId, eventId),
        or(ilike(guests.name, `%${q}%`), sql`${guests.phone} like ${"%" + q.replace(/[^0-9+]/g, "")}`),
      ),
    )
    .orderBy(asc(guests.name))
    .limit(limit);
}
