import type { Event } from "@/db/schema";
import { toDateTimeLocalValue } from "@/lib/dates";
import type { EventFormInput } from "@/lib/validation/event";

/** Converts a stored event into the string-shaped defaults the form expects. */
export function eventToFormDefaults(event: Event): Partial<EventFormInput> {
  const tz = event.timezone;
  return {
    title: event.title,
    eventType: event.eventType,
    honoreePrimary: event.honoreePrimary,
    honoreeSecondary: event.honoreeSecondary ?? undefined,
    familyNames: event.familyNames ?? undefined,
    description: event.description ?? undefined,
    startsAt: toDateTimeLocalValue(event.startsAt, tz),
    endsAt: event.endsAt ? toDateTimeLocalValue(event.endsAt, tz) : undefined,
    timezone: tz,
    venueName: event.venueName ?? undefined,
    venueAddress: event.venueAddress ?? undefined,
    venueMapsUrl: event.venueMapsUrl ?? undefined,
    locale: event.locale,
    theme: event.theme,
    giftEnabled: event.giftEnabled,
    giftHandle: event.giftHandle ?? undefined,
    giftNote: event.giftNote ?? undefined,
    rsvpMode: event.rsvpMode,
    rsvpDeadline: event.rsvpDeadline ? toDateTimeLocalValue(event.rsvpDeadline, tz) : undefined,
    openRsvpMaxSeats: String(event.openRsvpMaxSeats),
    galleryEnabled: event.galleryEnabled,
    galleryModeration: event.galleryModeration,
    coverImagePath: event.coverImagePath ?? undefined,
    revealImagePath: event.revealImagePath ?? undefined,
  };
}
