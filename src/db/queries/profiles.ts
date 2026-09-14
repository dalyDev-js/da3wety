import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles, type Profile } from "@/db/schema";
import { serverEnv } from "@/lib/env";

export async function getProfileById(id: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return row ?? null;
}

type AuthIdentity = {
  id: string;
  email: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

/**
 * Guarantees a profiles row for a signed-in user (the auth trigger normally creates
 * it) and promotes allow-listed emails to admin. Idempotent.
 */
export async function ensureProfile(identity: AuthIdentity): Promise<Profile> {
  const email = (identity.email ?? "").toLowerCase();
  const shouldBeAdmin = email !== "" && serverEnv().ADMIN_EMAILS.includes(email);

  await db
    .insert(profiles)
    .values({
      id: identity.id,
      email,
      fullName: identity.fullName ?? null,
      avatarUrl: identity.avatarUrl ?? null,
      isAdmin: shouldBeAdmin,
    })
    .onConflictDoNothing({ target: profiles.id });

  const existing = await getProfileById(identity.id);
  if (!existing) {
    throw new Error(`Profile ${identity.id} could not be created`);
  }

  const patch: Partial<Profile> = {};
  if (shouldBeAdmin && !existing.isAdmin) patch.isAdmin = true;
  if (email && existing.email !== email) patch.email = email;
  if (identity.fullName && !existing.fullName) patch.fullName = identity.fullName;
  if (identity.avatarUrl && !existing.avatarUrl) patch.avatarUrl = identity.avatarUrl;

  if (Object.keys(patch).length === 0) return existing;

  const [updated] = await db.update(profiles).set(patch).where(eq(profiles.id, identity.id)).returning();
  return updated ?? existing;
}

export async function updateProfileLocale(id: string, locale: Profile["locale"]) {
  await db.update(profiles).set({ locale }).where(eq(profiles.id, id));
}
