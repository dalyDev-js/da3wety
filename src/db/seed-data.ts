import type { Package } from "./schema/packages";

type PackageSeed = Omit<Package, "createdAt" | "updatedAt">;

export const PACKAGE_SEED: PackageSeed[] = [
  {
    tier: "basic",
    nameAr: "الباقة الأساسية",
    nameEn: "Basic",
    priceEgp: 0,
    sortOrder: 1,
    isActive: true,
    maxGuests: 300,
    galleryEnabled: false,
    moderationEnabled: false,
    maxPhotos: 0,
    photoRetentionDays: 7,
    checkinEnabled: false,
  },
  {
    tier: "standard",
    nameAr: "الباقة المتوسطة",
    nameEn: "Standard",
    priceEgp: 0,
    sortOrder: 2,
    isActive: true,
    maxGuests: 500,
    galleryEnabled: true,
    moderationEnabled: true,
    maxPhotos: 500,
    photoRetentionDays: 7,
    checkinEnabled: false,
  },
  {
    tier: "premium",
    nameAr: "الباقة المميزة",
    nameEn: "Premium",
    priceEgp: 0,
    sortOrder: 3,
    isActive: true,
    maxGuests: 1000,
    galleryEnabled: true,
    moderationEnabled: true,
    maxPhotos: 1000,
    photoRetentionDays: 7,
    checkinEnabled: true,
  },
];
