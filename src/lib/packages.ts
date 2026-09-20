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

export type PackageHighlight =
  | { key: "guests"; count: number | null }
  | { key: "gallery"; included: boolean }
  | { key: "photos"; count: number }
  | { key: "retention"; days: number }
  | { key: "moderation"; included: boolean }
  | { key: "checkin"; included: boolean };

type HighlightSource = Pick<
  Package,
  "maxGuests" | "galleryEnabled" | "moderationEnabled" | "maxPhotos" | "photoRetentionDays" | "checkinEnabled"
>;

/** Display bullets for a tier, in marketing order. Photo rows only appear when the gallery is included. */
export function packageHighlights(pkg: HighlightSource): PackageHighlight[] {
  const out: PackageHighlight[] = [
    { key: "guests", count: pkg.maxGuests },
    { key: "gallery", included: pkg.galleryEnabled },
  ];
  if (pkg.galleryEnabled) {
    out.push(
      { key: "photos", count: pkg.maxPhotos },
      { key: "retention", days: pkg.photoRetentionDays },
      { key: "moderation", included: pkg.moderationEnabled },
    );
  }
  out.push({ key: "checkin", included: pkg.checkinEnabled });
  return out;
}
