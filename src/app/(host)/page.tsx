import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const common = await getTranslations("Common");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <p className="font-heading text-5xl font-bold tracking-tight">{common("appName")}</p>
      <div className="max-w-xl space-y-3">
        <h1 className="text-3xl font-semibold text-balance">{t("hero")}</h1>
        <p className="text-muted-foreground text-lg text-pretty">{t("heroSub")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard">{t("cta")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">{t("login")}</Link>
        </Button>
      </div>
    </main>
  );
}
