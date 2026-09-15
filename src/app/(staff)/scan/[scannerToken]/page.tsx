import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getScannerSession } from "@/actions/checkin";
import { DoorScanner } from "@/components/scanner/door-scanner";

export const metadata: Metadata = { title: "Da3wety", robots: { index: false } };

export default async function ScannerPage({ params }: PageProps<"/scan/[scannerToken]">) {
  const { scannerToken } = await params;
  const session = await getScannerSession(scannerToken);
  const t = await getTranslations("Scanner");

  if (!session.ok) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-semibold">{t(`session.${session.reason}`)}</h1>
        <p className="max-w-sm text-muted-foreground">{t("sessionHint")}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <DoorScanner scannerToken={scannerToken} eventTitle={session.event.title} />
    </main>
  );
}
