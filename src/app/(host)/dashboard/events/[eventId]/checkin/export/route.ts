import { asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { getEventForHost } from "@/db/queries/events";
import { checkins, guests, rsvps } from "@/db/schema";
import { requireHost } from "@/lib/auth";

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Attendance report: one row per invitation with RSVP and admitted seats. */
export async function GET(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const host = await requireHost();
  const { eventId } = await params;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return new NextResponse("Not found", { status: 404 });

  const rows = await db
    .select({
      name: guests.name,
      phone: guests.phone,
      group: guests.groupLabel,
      maxSeats: guests.maxSeats,
      status: rsvps.status,
      message: rsvps.message,
      seats: rsvps.seats,
      admitted:
        sql<number>`coalesce((select sum(c.seats_admitted) from ${checkins} c where c.guest_id = ${guests.id}), 0)`.mapWith(
          Number,
        ),
      lastCheckin: sql<string | null>`(select max(c.created_at) from ${checkins} c where c.guest_id = ${guests.id})`,
    })
    .from(guests)
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .where(eq(guests.eventId, eventId))
    .orderBy(asc(guests.name));

  const header = [
    "name",
    "phone",
    "group",
    "max_seats",
    "rsvp",
    "message",
    "seats_attending",
    "seats_admitted",
    "last_checkin",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.phone,
        r.group,
        r.maxSeats,
        r.status ?? "pending",
        r.message ?? "",
        r.seats ?? 0,
        r.admitted,
        r.lastCheckin ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  // BOM so Excel opens Arabic correctly.
  const body = "\uFEFF" + lines.join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${ctx.event.slug}.csv"`,
    },
  });
}
