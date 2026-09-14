import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { events, guests, packages, rsvps, type Event, type Guest, type Package } from "@/db/schema";

export type EventWithPackage = { event: Event; pkg: Package };

const eventWithPackage = () =>
  db
    .select({ event: events, pkg: packages })
    .from(events)
    .innerJoin(packages, eq(packages.tier, events.packageTier));

/** Host dashboard list with RSVP summary. */
export const listEventsForHost = cache(async (hostId: string) => {
  return db
    .select({
      event: events,
      guestCount: sql<number>`(select count(*) from ${guests} g where g.event_id = ${events.id})`.mapWith(Number),
      attendingCount: sql<number>`(select count(*) from ${rsvps} r where r.event_id = ${events.id} and r.status = 'attending')`.mapWith(Number),
    })
    .from(events)
    .where(eq(events.hostId, hostId))
    .orderBy(desc(events.startsAt));
});

/** Ownership-checked fetch for dashboard pages and actions. */
export const getEventForHost = cache(async (eventId: string, hostId: string): Promise<EventWithPackage | null> => {
  const [row] = await eventWithPackage()
    .where(and(eq(events.id, eventId), eq(events.hostId, hostId)))
    .limit(1);
  return row ?? null;
});

/** Public invitation lookup by slug. */
export const getEventBySlug = cache(async (slug: string): Promise<EventWithPackage | null> => {
  const [row] = await eventWithPackage().where(eq(events.slug, slug)).limit(1);
  return row ?? null;
});

export type GuestContext = EventWithPackage & { guest: Guest };

/** Personal invitation lookup by guest token. */
export const getEventByGuestToken = cache(async (token: string): Promise<GuestContext | null> => {
  const [row] = await db
    .select({ event: events, pkg: packages, guest: guests })
    .from(guests)
    .innerJoin(events, eq(events.id, guests.eventId))
    .innerJoin(packages, eq(packages.tier, events.packageTier))
    .where(eq(guests.token, token))
    .limit(1);
  return row ?? null;
});

/** Cheap existence check used by the i18n request config (locale only). */
export const getEventLocaleBySlug = cache(async (slug: string) => {
  const [row] = await db.select({ locale: events.locale }).from(events).where(eq(events.slug, slug)).limit(1);
  return row?.locale ?? null;
});

export const getEventLocaleByGuestToken = cache(async (token: string) => {
  const [row] = await db
    .select({ locale: events.locale })
    .from(guests)
    .innerJoin(events, eq(events.id, guests.eventId))
    .where(eq(guests.token, token))
    .limit(1);
  return row?.locale ?? null;
});

export const countGuests = cache(async (eventId: string): Promise<number> => {
  const [row] = await db.select({ value: count() }).from(guests).where(eq(guests.eventId, eventId));
  return row?.value ?? 0;
});
