import type { Metadata, Viewport } from "next";

import { GuestShell } from "@/components/shells/guest-shell";
import { getEventLocaleByGuestToken } from "@/db/queries/events";
import { publicEnv } from "@/lib/env";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { GUEST_TOKEN_RE } from "@/lib/tokens";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv().NEXT_PUBLIC_SITE_URL),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3ebdd",
};

/** Root layout for personal invitations; never indexed, never throws. */
export default async function PersonalInvitationLayout({ children, params }: LayoutProps<"/i/[token]">) {
  const { token } = await params;
  const locale = (GUEST_TOKEN_RE.test(token) ? await getEventLocaleByGuestToken(token) : null) ?? DEFAULT_LOCALE;
  return <GuestShell locale={locale}>{children}</GuestShell>;
}
