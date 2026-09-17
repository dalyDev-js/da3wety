import { describe, expect, it } from "vitest";

import { buildIcs, googleCalendarUrl, icsFilename, outlookCalendarUrl, resolveEnd } from "@/lib/calendar";

const ev = {
  uid: "abc123@da3wety.com",
  title: "زفاف أحمد وسارة",
  description: "يسعدنا حضوركم؛ العنوان: كورنيش المعادي\nالقاهرة",
  location: "قاعة النيل, كورنيش المعادي",
  start: new Date("2026-10-15T16:00:00.000Z"),
  end: null,
  url: "https://da3wety.com/e/lhtestev01",
};

describe("calendar", () => {
  it("defaults the end to start + 4h", () => {
    expect(resolveEnd(ev.start, null).toISOString()).toBe("2026-10-15T20:00:00.000Z");
    expect(resolveEnd(ev.start, new Date("2026-10-15T18:00:00.000Z")).toISOString()).toBe("2026-10-15T18:00:00.000Z");
  });

  it("builds a valid ICS with UTC times, escaping and CRLF", () => {
    const ics = buildIcs(ev, new Date("2026-09-16T10:00:00.000Z"));
    const unfolded = ics.replace(/\r\n /g, "");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261015T160000Z");
    expect(ics).toContain("DTEND:20261015T200000Z");
    expect(ics).toContain("DTSTAMP:20260916T100000Z");
    expect(ics).toContain("UID:abc123@da3wety.com");
    expect(unfolded).toContain("LOCATION:قاعة النيل\\, كورنيش المعادي");
    expect(unfolded).toContain("DESCRIPTION:يسعدنا حضوركم؛ العنوان: كورنيش المعادي\\nالقاهرة");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });

  it("escapes ASCII semicolons in text values", () => {
    const unfolded = buildIcs({ ...ev, description: "Ceremony; reception" }).replace(/\r\n /g, "");
    expect(unfolded).toContain("DESCRIPTION:Ceremony\\; reception");
  });

  it("preserves UTC instants across Cairo's daylight-saving transition", () => {
    const cairoOffset = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      timeZoneName: "longOffset",
    });
    const offsetAt = (date: Date) =>
      cairoOffset.formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
    const ics = buildIcs({
      ...ev,
      start: new Date("2026-10-29T23:30:00+03:00"),
      end: new Date("2026-10-30T00:30:00+02:00"),
    });
    expect(offsetAt(new Date("2026-10-29T20:30:00Z"))).toBe("GMT+03:00");
    expect(offsetAt(new Date("2026-10-29T22:30:00Z"))).toBe("GMT+02:00");
    expect(ics).toContain("DTSTART:20261029T203000Z");
    expect(ics).toContain("DTEND:20261029T223000Z");
  });

  it("folds long lines with a leading space", () => {
    const ics = buildIcs({ ...ev, description: "x".repeat(200) });
    expect(ics).toMatch(/\r\n x+/);
  });

  it("builds Google and Outlook links", () => {
    const google = new URL(googleCalendarUrl(ev));
    expect(google.searchParams.get("dates")).toBe("20261015T160000Z/20261015T200000Z");
    expect(google.searchParams.get("text")).toBe(ev.title);
    const outlook = new URL(outlookCalendarUrl(ev));
    expect(outlook.searchParams.get("startdt")).toBe("2026-10-15T16:00:00.000Z");
    expect(outlook.searchParams.get("subject")).toBe(ev.title);
  });

  it("makes a safe filename", () => {
    expect(icsFilename("زفاف أحمد وسارة")).toBe("da3wety-invitation.ics");
    expect(icsFilename("Ahmed & Sara's Wedding")).toBe("da3wety-ahmed-sara-s-wedding.ics");
  });
});
