import type { Metadata, Viewport } from "next";
import { eq } from "drizzle-orm";

import { GuestShell } from "@/components/shells/guest-shell";
import { db } from "@/db";
import { events } from "@/db/schema";
import { publicEnv } from "@/lib/env";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { SCANNER_TOKEN_RE } from "@/lib/tokens";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv().NEXT_PUBLIC_SITE_URL),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

/** Root layout for the staff scanner; locale follows the event. */
export default async function ScannerLayout({ children, params }: LayoutProps<"/scan/[scannerToken]">) {
  const { scannerToken } = await params;
  let locale = DEFAULT_LOCALE;
  if (SCANNER_TOKEN_RE.test(scannerToken)) {
    const [row] = await db
      .select({ locale: events.locale })
      .from(events)
      .where(eq(events.scannerToken, scannerToken))
      .limit(1);
    if (row) locale = row.locale;
  }
  return <GuestShell locale={locale}>{children}</GuestShell>;
}
