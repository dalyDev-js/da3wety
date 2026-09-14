import "server-only";

import { and, count, eq, sql, sum } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { checkins, guests, rsvps } from "@/db/schema";

export type RsvpStats = {
  guests: number;
  attending: number;
  declined: number;
  pending: number;
  expectedSeats: number;
  invitedSeats: number;
};

export const getRsvpStats = cache(async (eventId: string): Promise<RsvpStats> => {
  const [g] = await db
    .select({ guests: count(), invitedSeats: sum(guests.maxSeats).mapWith(Number) })
    .from(guests)
    .where(eq(guests.eventId, eventId));

  const [r] = await db
    .select({
      attending: sql<number>`count(*) filter (where ${rsvps.status} = 'attending')`.mapWith(Number),
      declined: sql<number>`count(*) filter (where ${rsvps.status} = 'declined')`.mapWith(Number),
      expectedSeats: sql<number>`coalesce(sum(${rsvps.seats}) filter (where ${rsvps.status} = 'attending'), 0)`.mapWith(
        Number,
      ),
    })
    .from(rsvps)
    .where(eq(rsvps.eventId, eventId));

  const totalGuests = g?.guests ?? 0;
  const attending = r?.attending ?? 0;
  const declined = r?.declined ?? 0;
  return {
    guests: totalGuests,
    attending,
    declined,
    pending: Math.max(0, totalGuests - attending - declined),
    expectedSeats: r?.expectedSeats ?? 0,
    invitedSeats: g?.invitedSeats ?? 0,
  };
});

export type CheckinStats = {
  partiesCheckedIn: number;
  seatsAdmitted: number;
};

export const getCheckinStats = cache(async (eventId: string): Promise<CheckinStats> => {
  const [row] = await db
    .select({
      partiesCheckedIn: sql<number>`count(distinct ${checkins.guestId})`.mapWith(Number),
      seatsAdmitted: sql<number>`coalesce(sum(${checkins.seatsAdmitted}), 0)`.mapWith(Number),
    })
    .from(checkins)
    .where(and(eq(checkins.eventId, eventId)));
  return { partiesCheckedIn: row?.partiesCheckedIn ?? 0, seatsAdmitted: row?.seatsAdmitted ?? 0 };
});
