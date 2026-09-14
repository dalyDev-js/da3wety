import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { ensureProfile, getProfileById } from "@/db/queries/profiles";
import type { Profile } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string | null;
};

/**
 * Verified identity from the JWT (getClaims validates the signature locally when the
 * project uses asymmetric keys). Cached per request.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** The signed-in host's profile, or null. Cached per request. */
export const currentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  return (await getProfileById(user.id)) ?? ensureProfile(user);
});

/** Call in every dashboard page and every host server action; redirects when signed out. */
export async function requireHost(): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Admin surface: non-admins get a 404 rather than a hint that the page exists. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireHost();
  if (!profile.isAdmin) notFound();
  return profile;
}
