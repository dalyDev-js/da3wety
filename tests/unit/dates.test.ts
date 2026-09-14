import { describe, expect, it } from "vitest";

import {
  computeGalleryExpiresAt,
  computeScannerTokenExpiresAt,
  toDateTimeLocalValue,
  wallClockToUtc,
} from "@/lib/dates";

const CAIRO = "Africa/Cairo";

describe("wallClockToUtc", () => {
  it("converts Cairo winter time (UTC+2)", () => {
    // 2026-01-15 18:30 Cairo = 16:30 UTC
    expect(wallClockToUtc("2026-01-15T18:30", CAIRO).toISOString()).toBe("2026-01-15T16:30:00.000Z");
  });

  it("converts Cairo summer time (UTC+3, DST reinstated in 2023)", () => {
    // 2026-07-10 20:00 Cairo = 17:00 UTC
    expect(wallClockToUtc("2026-07-10T20:00", CAIRO).toISOString()).toBe("2026-07-10T17:00:00.000Z");
  });

  it("handles the DST boundary: last Friday of April 2026 (24 Apr) at 00:00 clocks jump to 01:00", () => {
    // 23:00 on Thu 23 Apr is still UTC+2; 02:00 on Fri 24 Apr is UTC+3.
    expect(wallClockToUtc("2026-04-23T23:00", CAIRO).toISOString()).toBe("2026-04-23T21:00:00.000Z");
    expect(wallClockToUtc("2026-04-24T02:00", CAIRO).toISOString()).toBe("2026-04-23T23:00:00.000Z");
  });

  it("accepts seconds in the input and rejects garbage", () => {
    expect(wallClockToUtc("2026-01-15T18:30:15", CAIRO).toISOString()).toBe("2026-01-15T16:30:15.000Z");
    expect(() => wallClockToUtc("not a date", CAIRO)).toThrow();
    expect(() => wallClockToUtc("2026-13-40T99:99", CAIRO)).toThrow();
  });
});

describe("toDateTimeLocalValue", () => {
  it("formats a UTC instant as the zone's wall clock for <input type=datetime-local>", () => {
    const utc = new Date("2026-07-10T17:00:00.000Z");
    expect(toDateTimeLocalValue(utc, CAIRO)).toBe("2026-07-10T20:00");
    expect(toDateTimeLocalValue(new Date("2026-01-15T16:05:00.000Z"), CAIRO)).toBe("2026-01-15T18:05");
  });

  it("round-trips with wallClockToUtc", () => {
    const value = "2026-10-29T23:30"; // near the October DST end (last Thursday of October)
    const utc = wallClockToUtc(value, CAIRO);
    expect(toDateTimeLocalValue(utc, CAIRO)).toBe(value);
  });
});

describe("computeGalleryExpiresAt", () => {
  const starts = new Date("2026-05-01T18:00:00.000Z");
  const ends = new Date("2026-05-02T01:00:00.000Z");

  it("uses endsAt when present, else startsAt, plus retention days", () => {
    expect(computeGalleryExpiresAt({ startsAt: starts, endsAt: ends, retentionDays: 7 }).toISOString()).toBe(
      "2026-05-09T01:00:00.000Z",
    );
    expect(computeGalleryExpiresAt({ startsAt: starts, endsAt: null, retentionDays: 7 }).toISOString()).toBe(
      "2026-05-08T18:00:00.000Z",
    );
  });

  it("rejects negative retention", () => {
    expect(() => computeGalleryExpiresAt({ startsAt: starts, endsAt: null, retentionDays: -1 })).toThrow();
  });
});

describe("computeScannerTokenExpiresAt", () => {
  it("is 24h after the event end (or start)", () => {
    const starts = new Date("2026-05-01T18:00:00.000Z");
    expect(computeScannerTokenExpiresAt({ startsAt: starts, endsAt: null }).toISOString()).toBe(
      "2026-05-02T18:00:00.000Z",
    );
  });
});
