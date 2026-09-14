import { describe, expect, it } from "vitest";

import { PACKAGE_SEED } from "@/db/seed-data";
import { assertFeature, FeatureLockedError, packageAllows, tierRank } from "@/lib/packages";

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
