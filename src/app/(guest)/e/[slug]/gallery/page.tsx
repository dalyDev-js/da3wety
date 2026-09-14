import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuestGallery } from "@/components/gallery/guest-gallery";
import { getVisibleEventBySlug } from "@/lib/invitation-access";

export async function generateMetadata({ params }: PageProps<"/e/[slug]/gallery">): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getVisibleEventBySlug(slug);
  return { title: ctx?.event.title ?? "Da3wety", robots: { index: false } };
}

export default async function PublicGalleryPage({ params }: PageProps<"/e/[slug]/gallery">) {
  const { slug } = await params;
  const ctx = await getVisibleEventBySlug(slug);
  if (!ctx) notFound();
  return <GuestGallery galleryRef={{ kind: "slug", value: slug }} backHref={`/e/${slug}`} />;
}
