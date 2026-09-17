import { describe, expect, it } from "vitest";

import { countdownParts } from "@/lib/countdown";

describe("countdownParts", () => {
  it("splits the remaining time into days, hours, minutes (floored)", () => {
    const target = new Date("2026-10-15T16:00:00.000Z");
    expect(countdownParts(target, new Date("2026-10-13T13:30:20.000Z"))).toEqual({ days: 2, hours: 2, minutes: 29 });
  });

  it("is null at or after the target", () => {
    const t = new Date("2026-10-15T16:00:00.000Z");
    expect(countdownParts(t, t)).toBeNull();
    expect(countdownParts(t, new Date(t.getTime() + 1))).toBeNull();
  });

  it("ignores the DST change (uses absolute time)", () => {
    expect(countdownParts(new Date("2026-04-24T02:00:00+03:00"), new Date("2026-04-23T02:00:00+02:00"))).toEqual({
      days: 0,
      hours: 23,
      minutes: 0,
    });
  });
});
