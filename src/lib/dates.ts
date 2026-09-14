import { TZDate } from "@date-fns/tz";

/**
 * Date helpers that are explicit about time zones.
 * Events store instants (timestamptz) plus an IANA `timezone`; hosts enter wall-clock
 * times through <input type="datetime-local">, which carries no zone information.
 */

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parses a datetime-local value ("2026-04-24T18:30") as wall-clock time in `timeZone`
 * and returns the corresponding UTC instant. Handles DST transitions via TZDate.
 */
export function wallClockToUtc(value: string, timeZone: string): Date {
  const match = DATETIME_LOCAL_RE.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }
  const [, y, mo, d, h, mi, s] = match;
  const year = Number(y);
  const month = Number(mo) - 1;
  const day = Number(d);
  const hours = Number(h);
  const minutes = Number(mi);
  const seconds = s ? Number(s) : 0;

  if (month < 0 || month > 11 || day < 1 || day > 31 || hours > 23 || minutes > 59 || seconds > 59) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }

  const zoned = new TZDate(year, month, day, hours, minutes, seconds, timeZone);
  // Guard against overflowed components (e.g. Feb 30) that Date silently normalizes.
  if (zoned.getMonth() !== month || zoned.getDate() !== day) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }
  return new Date(zoned.getTime());
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats a UTC instant as the wall clock of `timeZone` for a datetime-local input. */
export function toDateTimeLocalValue(date: Date, timeZone: string): string {
  const zoned = new TZDate(date, timeZone);
  return `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}T${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

type EventWindow = { startsAt: Date; endsAt: Date | null };

/** Gallery photos are purged `retentionDays` after the event ends (or starts if no end). */
export function computeGalleryExpiresAt({
  startsAt,
  endsAt,
  retentionDays,
}: EventWindow & { retentionDays: number }): Date {
  if (!Number.isInteger(retentionDays) || retentionDays < 0) {
    throw new Error(`Invalid retentionDays: ${retentionDays}`);
  }
  return addDays(endsAt ?? startsAt, retentionDays);
}

/** Staff scanner links stop working a day after the event. */
export function computeScannerTokenExpiresAt({ startsAt, endsAt }: EventWindow): Date {
  return addDays(endsAt ?? startsAt, 1);
}
