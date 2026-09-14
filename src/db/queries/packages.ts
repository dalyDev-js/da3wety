import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { packages, type Package, type PackageTier } from "@/db/schema";

export const getPackage = cache(async (tier: PackageTier): Promise<Package> => {
  const [row] = await db.select().from(packages).where(eq(packages.tier, tier)).limit(1);
  if (!row) throw new Error(`Package "${tier}" is not seeded`);
  return row;
});

export const listPackages = cache(async (): Promise<Package[]> => {
  return db.select().from(packages).orderBy(packages.sortOrder);
});
