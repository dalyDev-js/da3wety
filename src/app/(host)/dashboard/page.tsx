import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { requireHost } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("myEvents"), robots: { index: false } };
}

export default async function DashboardPage() {
  const profile = await requireHost();
  const t = await getTranslations("Dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("myEvents")}</h1>
        <p className="text-muted-foreground text-sm">{t("welcome", { name: profile.fullName ?? profile.email })}</p>
      </div>
      {/* Event list arrives in Phase 3. */}
    </div>
  );
}
