import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { fontClassName } from "@/lib/fonts";
import { htmlLang, TEXT_DIRECTION, toAppLocale } from "@/lib/i18n/config";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false },
};

/**
 * Rendered for URLs that match no route at all (experimental.globalNotFound).
 * Must render a full document because no root layout applies here.
 */
export default async function GlobalNotFound() {
  const locale = toAppLocale(await getLocale());
  const t = await getTranslations("Errors");

  return (
    <html lang={htmlLang(locale)} dir={TEXT_DIRECTION[locale]} className={`${fontClassName} h-full antialiased`}>
      <body className="flex min-h-full flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="max-w-md text-muted-foreground">{t("notFoundBody")}</p>
        <Button asChild variant="outline">
          <Link href="/">{t("goHome")}</Link>
        </Button>
      </body>
    </html>
  );
}
