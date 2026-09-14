import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function HostNotFound() {
  const t = await getTranslations("Errors");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-muted-foreground font-mono text-sm">404</p>
      <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground max-w-md">{t("notFoundBody")}</p>
      <Button asChild variant="outline">
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </main>
  );
}
