import type { PackageTier } from "@/db/schema/enums";
import type { Package } from "@/db/schema/packages";

export type Feature = "gallery" | "moderation" | "checkin";

export type PackageFlags = Pick<Package, "tier" | "galleryEnabled" | "moderationEnabled" | "checkinEnabled">;

const FEATURE_COLUMN: Record<Feature, keyof Omit<PackageFlags, "tier">> = {
  gallery: "galleryEnabled",
  moderation: "moderationEnabled",
  checkin: "checkinEnabled",
};

export class FeatureLockedError extends Error {
  readonly feature: Feature;
  readonly tier: PackageTier;

  constructor(feature: Feature, tier: PackageTier) {
    super(`Feature "${feature}" is not included in the ${tier} package`);
    this.name = "FeatureLockedError";
    this.feature = feature;
    this.tier = tier;
  }
}

export function packageAllows(pkg: PackageFlags, feature: Feature): boolean {
  return pkg[FEATURE_COLUMN[feature]] === true;
}

/** Throws FeatureLockedError; server actions map it to a localized "upgrade" message. */
export function assertFeature(pkg: PackageFlags, feature: Feature): void {
  if (!packageAllows(pkg, feature)) {
    throw new FeatureLockedError(feature, pkg.tier);
  }
}

const TIER_RANK: Record<PackageTier, number> = { basic: 0, standard: 1, premium: 2 };

export function tierRank(tier: PackageTier): number {
  return TIER_RANK[tier];
}
