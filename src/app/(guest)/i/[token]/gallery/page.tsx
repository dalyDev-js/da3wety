import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuestGallery } from "@/components/gallery/guest-gallery";
import { getEventByGuestToken } from "@/db/queries/events";
import { GUEST_TOKEN_RE } from "@/lib/tokens";

export async function generateMetadata({ params }: PageProps<"/i/[token]/gallery">): Promise<Metadata> {
  const { token } = await params;
  const ctx = GUEST_TOKEN_RE.test(token) ? await getEventByGuestToken(token) : null;
  return { title: ctx?.event.title ?? "Da3wety", robots: { index: false } };
}

export default async function PersonalGalleryPage({ params, searchParams }: PageProps<"/i/[token]/gallery">) {
  const { token } = await params;
  const ctx = GUEST_TOKEN_RE.test(token) ? await getEventByGuestToken(token) : null;
  if (!ctx || ctx.event.status !== "published") notFound();
  return (
    <GuestGallery
      galleryRef={{ kind: "token", value: token }}
      backHref={`/i/${token}`}
      page={(await searchParams).page}
    />
  );
}
