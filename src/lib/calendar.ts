/**
 * Calendar helpers for the invitation: an RFC 5545 .ics body (Apple/other) and
 * deep links for Google and Outlook. Pure functions; times are UTC instants.
 */
export type CalendarEvent = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: Date;
  end: Date | null;
  url?: string;
};

export const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000;

export function resolveEnd(start: Date, end: Date | null): Date {
  return end ?? new Date(start.getTime() + DEFAULT_DURATION_MS);
}

/** 20261015T160000Z */
function stampUtc(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: lines longer than 75 octets are folded with CRLF + space. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const next = current + ch;
    if (Buffer.byteLength(next, "utf8") > 75 - (out.length ? 1 : 0)) {
      out.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  out.push(current);
  return out.map((l, i) => (i ? ` ${l}` : l)).join("\r\n");
}

export function buildIcs(ev: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Da3wety//Invitation//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${stampUtc(now)}`,
    `DTSTART:${stampUtc(ev.start)}`,
    `DTEND:${stampUtc(resolveEnd(ev.start, ev.end))}`,
    `SUMMARY:${escapeText(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${stampUtc(ev.start)}/${stampUtc(resolveEnd(ev.start, ev.end))}`,
  });
  if (ev.description) p.set("details", ev.description);
  if (ev.location) p.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function outlookCalendarUrl(ev: CalendarEvent): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: ev.title,
    startdt: ev.start.toISOString(),
    enddt: resolveEnd(ev.start, ev.end).toISOString(),
  });
  if (ev.description) p.set("body", ev.description);
  if (ev.location) p.set("location", ev.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p}`;
}

/** ASCII-only filename; Arabic titles fall back to a generic name. */
export function icsFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `da3wety-${slug || "invitation"}.ics`;
}
