import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Wordmark } from "@/components/brand/wordmark";
import { LocaleToggle } from "@/components/dashboard/locale-toggle";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/config";

const NAV = [
  { href: "#features", key: "features" },
  { href: "#how-it-works", key: "howItWorks" },
  { href: "#pricing", key: "pricing" },
  { href: "#faq", key: "faq" },
] as const;

/** Sticky marketing header: wordmark, anchor nav (desktop), language toggle, sign-in and the primary CTA. */
export async function SiteHeader({ locale }: { locale: AppLocale }) {
  const [t, common] = await Promise.all([getTranslations("Landing.nav"), getTranslations("Common")]);
  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Wordmark size="sm" href="/" />
        <nav aria-label="primary" className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LocaleToggle
            current={locale}
            labels={{ ar: common("arabic"), en: common("english"), language: common("language") }}
          />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">{t("cta")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
