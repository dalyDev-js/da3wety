import type { Metadata, Viewport } from "next";
import { eq } from "drizzle-orm";

import { GuestShell } from "@/components/shells/guest-shell";
import { db } from "@/db";
import { events, qrTokens } from "@/db/schema";
import { publicEnv } from "@/lib/env";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { QR_TOKEN_RE } from "@/lib/tokens";

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

/** Root layout for the ticket view opened by a normal camera app. */
export default async function TicketLayout({ children, params }: LayoutProps<"/q/[qrToken]">) {
  const { qrToken } = await params;
  let locale = DEFAULT_LOCALE;
  if (QR_TOKEN_RE.test(qrToken)) {
    const [row] = await db
      .select({ locale: events.locale })
      .from(qrTokens)
      .innerJoin(events, eq(events.id, qrTokens.eventId))
      .where(eq(qrTokens.token, qrToken))
      .limit(1);
    if (row) locale = row.locale;
  }
  return <GuestShell locale={locale}>{children}</GuestShell>;
}
