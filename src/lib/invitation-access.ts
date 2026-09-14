import "server-only";

import { getEventBySlug, type EventWithPackage } from "@/db/queries/events";
import { currentProfile } from "@/lib/auth";

/**
 * Public invitation visibility: published events are public; drafts are visible
 * only to their host (preview). Returns null when the guest should see a 404.
 */
export async function getVisibleEventBySlug(slug: string): Promise<EventWithPackage | null> {
  const ctx = await getEventBySlug(slug);
  if (!ctx) return null;
  if (ctx.event.status === "published") return ctx;
  const profile = await currentProfile();
  return profile && profile.id === ctx.event.hostId ? ctx : null;
}
