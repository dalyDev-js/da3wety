"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { getEventForHost } from "@/db/queries/events";
import { searchGuestsForScanner } from "@/db/queries/guests";
import { checkins, events, guests, qrTokens, rsvps, type Event } from "@/db/schema";
import { requireHost } from "@/lib/auth";
import { computeScannerTokenExpiresAt } from "@/lib/dates";
import { log } from "@/lib/log";
import { assertFeature, packageAllows } from "@/lib/packages";
import { parseScanInput } from "@/lib/qr";
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit";
import { scannerToken as makeScannerToken, SCANNER_TOKEN_RE } from "@/lib/tokens";
import { maskPhone } from "@/lib/validation/phone";
import { z } from "@/lib/validation/zod-config";

/* ---------- host: enable check-in / rotate the staff link ---------- */

export async function enableCheckin(eventId: string): Promise<void> {
  const host = await requireHost();
  if (!z.uuid().safeParse(eventId).success) return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;
  assertFeature(ctx.pkg, "checkin");
  await db
    .update(events)
    .set({
      checkinEnabled: true,
      scannerToken: ctx.event.scannerToken ?? makeScannerToken(),
      scannerTokenRotatedAt: ctx.event.scannerToken ? ctx.event.scannerTokenRotatedAt : new Date(),
      scannerTokenExpiresAt: computeScannerTokenExpiresAt(ctx.event),
    })
    .where(eq(events.id, eventId));
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
}

export async function rotateScannerToken(eventId: string): Promise<void> {
  const host = await requireHost();
  if (!z.uuid().safeParse(eventId).success) return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;
  await db
    .update(events)
    .set({
      scannerToken: makeScannerToken(),
      scannerTokenRotatedAt: new Date(),
      scannerTokenExpiresAt: computeScannerTokenExpiresAt(ctx.event),
    })
    .where(eq(events.id, eventId));
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
}

/* ---------- staff: scanner actions (authorized by the scanner token) ---------- */

export type ScannerEvent = Pick<Event, "id" | "title" | "locale" | "startsAt" | "timezone">;

export type ScannerSession =
  { ok: true; event: ScannerEvent } | { ok: false; reason: "invalid" | "expired" | "disabled" };

async function resolveScanner(token: string): Promise<ScannerSession> {
  if (!SCANNER_TOKEN_RE.test(token)) return { ok: false, reason: "invalid" };
  const [row] = await db
    .select({
      id: events.id,
      title: events.title,
      locale: events.locale,
      startsAt: events.startsAt,
      timezone: events.timezone,
      checkinEnabled: events.checkinEnabled,
      expiresAt: events.scannerTokenExpiresAt,
      status: events.status,
    })
    .from(events)
    .where(eq(events.scannerToken, token))
    .limit(1);
  if (!row) return { ok: false, reason: "invalid" };
  if (!row.checkinEnabled || row.status !== "published") return { ok: false, reason: "disabled" };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return {
    ok: true,
    event: { id: row.id, title: row.title, locale: row.locale, startsAt: row.startsAt, timezone: row.timezone },
  };
}

export async function getScannerSession(token: string): Promise<ScannerSession> {
  return resolveScanner(token);
}

export type LookupResult =
  | {
      state: "ok" | "already_checked_in" | "declined" | "no_rsvp";
      guest: { id: string; name: string; maxSeats: number; groupLabel: string | null };
      seatsAttending: number;
      seatsAdmitted: number;
      lastCheckinAt: string | null;
      qrTokenId: string | null;
    }
  | { state: "unknown" | "rate_limited" | "session_invalid" };

/** Resolves a scanned QR / typed short code to a guest and their door status. */
export async function lookupByCode(scannerToken: string, raw: string): Promise<LookupResult> {
  const session = await resolveScanner(scannerToken);
  if (!session.ok) return { state: "session_invalid" };
  try {
    await enforceRateLimit({ scope: "scan-lookup", subject: scannerToken, limit: 600, windowSeconds: 600 });
  } catch (error) {
    if (error instanceof RateLimitedError) return { state: "rate_limited" };
    throw error;
  }
  const input = parseScanInput(raw);
  if (!input) return { state: "unknown" };

  const where =
    input.kind === "qr"
      ? and(eq(qrTokens.token, input.value), eq(qrTokens.eventId, session.event.id))
      : and(eq(qrTokens.shortCode, input.value), eq(qrTokens.eventId, session.event.id));
  const [row] = await db
    .select({ token: qrTokens, guest: guests, rsvp: rsvps })
    .from(qrTokens)
    .innerJoin(guests, eq(guests.id, qrTokens.guestId))
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .where(and(where, eq(qrTokens.status, "active")))
    .limit(1);
  if (!row) return { state: "unknown" };

  return describeGuest(session.event.id, row.guest, row.rsvp, row.token.id);
}

async function describeGuest(
  eventId: string,
  guest: typeof guests.$inferSelect,
  rsvp: typeof rsvps.$inferSelect | null,
  qrTokenId: string | null,
): Promise<LookupResult> {
  const [agg] = await db
    .select({
      seatsAdmitted: sql<number>`coalesce(sum(${checkins.seatsAdmitted}), 0)`.mapWith(Number),
      lastAt: sql<string | null>`max(${checkins.createdAt})`,
    })
    .from(checkins)
    .where(and(eq(checkins.eventId, eventId), eq(checkins.guestId, guest.id)));
  const seatsAdmitted = agg?.seatsAdmitted ?? 0;
  const base = {
    guest: { id: guest.id, name: guest.name, maxSeats: guest.maxSeats, groupLabel: guest.groupLabel },
    seatsAttending: rsvp?.status === "attending" ? rsvp.seats : 0,
    seatsAdmitted,
    lastCheckinAt: agg?.lastAt ? new Date(agg.lastAt).toISOString() : null,
    qrTokenId,
  };
  if (!rsvp) return { state: "no_rsvp", ...base };
  if (rsvp.status === "declined") return { state: "declined", ...base };
  if (seatsAdmitted >= rsvp.seats) return { state: "already_checked_in", ...base };
  return { state: "ok", ...base };
}

const recordInput = z.object({
  guestId: z.uuid(),
  qrTokenId: z.uuid().nullable(),
  seats: z.number().int().min(1).max(50),
  scannedBy: z.string().trim().max(60).optional(),
  method: z.enum(["qr", "manual"]),
});

export type RecordResult = { ok: true; seatsAdmitted: number } | { ok: false };

/** Records an admission. Locks the guest row so two phones cannot double-admit. */
export async function recordCheckin(scannerToken: string, input: z.input<typeof recordInput>): Promise<RecordResult> {
  const session = await resolveScanner(scannerToken);
  const parsed = recordInput.safeParse(input);
  if (!session.ok || !parsed.success) return { ok: false };
  const eventId = session.event.id;
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;

  const result = await db.transaction(async (tx) => {
    const [guest] = await tx
      .select({ id: guests.id })
      .from(guests)
      .where(and(eq(guests.id, parsed.data.guestId), eq(guests.eventId, eventId)))
      .for("update");
    if (!guest) return null;
    await tx.insert(checkins).values({
      eventId,
      guestId: guest.id,
      qrTokenId: parsed.data.qrTokenId,
      method: parsed.data.method,
      seatsAdmitted: parsed.data.seats,
      scannedBy: parsed.data.scannedBy || null,
      userAgent: ua,
    });
    const [agg] = await tx
      .select({ total: sql<number>`coalesce(sum(${checkins.seatsAdmitted}), 0)`.mapWith(Number) })
      .from(checkins)
      .where(and(eq(checkins.eventId, eventId), eq(checkins.guestId, guest.id)));
    return agg?.total ?? parsed.data.seats;
  });
  if (result === null) return { ok: false };

  log.info("checkin.record", "admitted", { eventId, guestId: parsed.data.guestId, seats: parsed.data.seats });
  revalidatePath(`/dashboard/events/${eventId}/checkin`);
  return { ok: true, seatsAdmitted: result };
}

export type SearchHit = {
  id: string;
  name: string;
  phoneMasked: string;
  groupLabel: string | null;
  status: "attending" | "declined" | "pending";
};

/** Name/phone search for the door, event-scoped, masked phones, capped results. */
export async function searchGuests(scannerToken: string, term: string): Promise<SearchHit[]> {
  const session = await resolveScanner(scannerToken);
  if (!session.ok) return [];
  try {
    await enforceRateLimit({ scope: "scan-search", subject: scannerToken, limit: 300, windowSeconds: 600 });
  } catch {
    return [];
  }
  const rows = await searchGuestsForScanner(session.event.id, term, 5);
  return rows.map(({ guest, rsvp }) => ({
    id: guest.id,
    name: guest.name,
    phoneMasked: maskPhone(guest.phone),
    groupLabel: guest.groupLabel,
    status: rsvp?.status ?? "pending",
  }));
}

/** Manual admission by guest id (from search); still event-scoped through the scanner. */
export async function lookupByGuestId(scannerToken: string, guestId: string): Promise<LookupResult> {
  const session = await resolveScanner(scannerToken);
  if (!session.ok || !z.uuid().safeParse(guestId).success) return { state: "session_invalid" };
  const [row] = await db
    .select({ guest: guests, rsvp: rsvps, token: qrTokens })
    .from(guests)
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .leftJoin(qrTokens, and(eq(qrTokens.guestId, guests.id), eq(qrTokens.status, "active")))
    .where(and(eq(guests.id, guestId), eq(guests.eventId, session.event.id)))
    .orderBy(desc(qrTokens.issuedAt))
    .limit(1);
  if (!row) return { state: "unknown" };
  return describeGuest(session.event.id, row.guest, row.rsvp, row.token?.id ?? null);
}

/** Whether the event may use check-in at all (for the dashboard). */
export async function checkinAllowed(eventId: string): Promise<boolean> {
  const host = await requireHost();
  const ctx = await getEventForHost(eventId, host.id);
  return Boolean(ctx && packageAllows(ctx.pkg, "checkin"));
}
