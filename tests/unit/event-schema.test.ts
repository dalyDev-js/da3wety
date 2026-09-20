import { describe, expect, it } from "vitest";

import { eventFormSchema } from "@/lib/validation/event";

const base = {
  title: "زفاف أحمد وسارة",
  eventType: "wedding",
  honoreePrimary: "أحمد",
  startsAt: "2026-10-15T19:00",
  timezone: "Africa/Cairo",
  locale: "ar",
  rsvpMode: "open",
  openRsvpMaxSeats: "2",
  galleryEnabled: false,
  galleryModeration: false,
  theme: "ivory",
  giftEnabled: false,
};

describe("eventFormSchema extras", () => {
  it("only accepts HTTP(S) map links", () => {
    expect(eventFormSchema.safeParse({ ...base, venueMapsUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...base, venueMapsUrl: "https://maps.google.com/" }).success).toBe(true);
  });
  it("defaults theme to ivory and gift to off", () => {
    const out = eventFormSchema.parse(base);
    expect(out.theme).toBe("ivory");
    expect(out.giftEnabled).toBe(false);
    expect(out.giftHandle).toBeNull();
    expect(out.giftNote).toBeNull();
  });

  it("rejects an unknown theme", () => {
    expect(eventFormSchema.safeParse({ ...base, theme: "neon" }).success).toBe(false);
  });

  it("requires a handle when the gift section is enabled", () => {
    const res = eventFormSchema.safeParse({ ...base, giftEnabled: true });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toEqual(["giftHandle"]);
  });

  it("trims the handle and caps the note at 200", () => {
    const out = eventFormSchema.parse({
      ...base,
      giftEnabled: true,
      giftHandle: " ahmed@instapay ",
      giftNote: "x".repeat(200),
    });
    expect(out.giftHandle).toBe("ahmed@instapay");
    expect(
      eventFormSchema.safeParse({
        ...base,
        giftEnabled: true,
        giftHandle: "a",
        giftNote: "x".repeat(201),
      }).success,
    ).toBe(false);
  });
});
