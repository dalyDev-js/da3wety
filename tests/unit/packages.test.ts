import { describe, expect, it } from "vitest";

import { PACKAGE_SEED } from "@/db/seed-data";
import { assertFeature, FeatureLockedError, packageAllows, packageHighlights, tierRank } from "@/lib/packages";

const byTier = Object.fromEntries(PACKAGE_SEED.map((p) => [p.tier, p]));

describe("packageAllows (gating matrix)", () => {
  it.each([
    ["basic", "gallery", false],
    ["basic", "moderation", false],
    ["basic", "checkin", false],
    ["standard", "gallery", true],
    ["standard", "moderation", true],
    ["standard", "checkin", false],
    ["premium", "gallery", true],
    ["premium", "moderation", true],
    ["premium", "checkin", true],
  ] as const)("%s / %s -> %s", (tier, feature, expected) => {
    expect(packageAllows(byTier[tier], feature)).toBe(expected);
  });
});

describe("assertFeature", () => {
  it("throws FeatureLockedError with the feature and tier", () => {
    expect(() => assertFeature(byTier.basic, "checkin")).toThrowError(FeatureLockedError);
    try {
      assertFeature(byTier.basic, "gallery");
    } catch (e) {
      expect(e).toBeInstanceOf(FeatureLockedError);
      expect((e as FeatureLockedError).feature).toBe("gallery");
      expect((e as FeatureLockedError).tier).toBe("basic");
    }
  });

  it("passes silently when allowed", () => {
    expect(() => assertFeature(byTier.premium, "checkin")).not.toThrow();
  });
});

describe("tierRank", () => {
  it("orders tiers", () => {
    expect(tierRank("basic")).toBeLessThan(tierRank("standard"));
    expect(tierRank("standard")).toBeLessThan(tierRank("premium"));
  });
});

describe("packageHighlights", () => {
  it("basic: guests, gallery off, checkin off — no photo rows", () => {
    expect(packageHighlights(byTier.basic)).toEqual([
      { key: "guests", count: 300 },
      { key: "gallery", included: false },
      { key: "checkin", included: false },
    ]);
  });

  it("premium: full list in display order", () => {
    expect(packageHighlights(byTier.premium)).toEqual([
      { key: "guests", count: 1000 },
      { key: "gallery", included: true },
      { key: "photos", count: 1000 },
      { key: "retention", days: 7 },
      { key: "moderation", included: true },
      { key: "checkin", included: true },
    ]);
  });

  it("null maxGuests means unlimited", () => {
    expect(packageHighlights({ ...byTier.basic, maxGuests: null })[0]).toEqual({ key: "guests", count: null });
  });
});
