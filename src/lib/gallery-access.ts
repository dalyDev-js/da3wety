import "server-only";

import { cookies } from "next/headers";

import { getEventByGuestToken, getEventBySlug, type EventWithPackage } from "@/db/queries/events";
import { GUEST_TOKEN_RE, SLUG_RE, guestToken } from "@/lib/tokens";

export type GalleryRef = { kind: "slug" | "token"; value: string };

const SESSION_COOKIE = "da3wety_upload_session";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Resolves a public or personal link to its event (+ guest for personal links). */
export async function resolveGalleryRef(
  ref: GalleryRef,
): Promise<(EventWithPackage & { guestId: string | null; guestName: string | null }) | null> {
  if (!ref || (ref.kind !== "token" && ref.kind !== "slug") || typeof ref.value !== "string") return null;
  if (ref.kind === "token") {
    if (!GUEST_TOKEN_RE.test(ref.value)) return null;
    const ctx = await getEventByGuestToken(ref.value);
    return ctx ? { ...ctx, guestId: ctx.guest.id, guestName: ctx.guest.name } : null;
  }
  if (!SLUG_RE.test(ref.value)) return null;
  const ctx = await getEventBySlug(ref.value);
  return ctx ? { ...ctx, guestId: null, guestName: null } : null;
}

export type GalleryState = "open" | "disabled" | "expired" | "purged" | "unpublished";

export function galleryState(ctx: EventWithPackage, now: Date = new Date()): GalleryState {
  const { event, pkg } = ctx;
  if (event.status !== "published") return "unpublished";
  if (!pkg.galleryEnabled || !event.galleryEnabled) return "disabled";
  if (event.galleryPurgedAt || event.purgeStartedAt) return "purged";
  if (event.galleryExpiresAt && event.galleryExpiresAt.getTime() < now.getTime()) return "expired";
  return "open";
}

/** Anonymous per-browser id so guests can delete their own uploads. */
export async function getUploadSession(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value && GUEST_TOKEN_RE.test(value) ? value : null;
}

/** Only callable from Server Actions / Route Handlers (sets a cookie). */
export async function ensureUploadSession(): Promise<string> {
  const existing = await getUploadSession();
  if (existing) return existing;
  const value = guestToken();
  (await cookies()).set(SESSION_COOKIE, value, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return value;
}
