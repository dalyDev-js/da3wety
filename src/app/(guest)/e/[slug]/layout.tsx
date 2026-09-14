import type { Metadata, Viewport } from "next";

import { GuestShell } from "@/components/shells/guest-shell";
import { getEventLocaleBySlug } from "@/db/queries/events";
import { publicEnv } from "@/lib/env";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv().NEXT_PUBLIC_SITE_URL),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3ebdd",
};

/**
 * Root layout for the public invitation. Never throws: an unknown slug renders
 * the default Arabic shell and the page reports not-found.
 */
export default async function PublicInvitationLayout({ children, params }: LayoutProps<"/e/[slug]">) {
  const { slug } = await params;
  const locale = (await getEventLocaleBySlug(slug)) ?? DEFAULT_LOCALE;
  return <GuestShell locale={locale}>{children}</GuestShell>;
}
