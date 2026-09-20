import { ArrowDownIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Eyebrow } from "@/components/brand/eyebrow";
import { InvitationPreview } from "@/components/marketing/invitation-preview";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/config";

export async function Hero({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.hero");
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2">
        <div className="space-y-6 text-center lg:text-start">
          <Eyebrow locale={locale}>{t("eyebrow")}</Eyebrow>
          <h1 className="font-heading text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-xl text-lg text-pretty text-muted-foreground lg:mx-0">{t("subtitle")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="h-11 px-6 text-base">
              <Link href="/dashboard">{t("cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-6 text-base">
              <a href="#how-it-works">
                {t("secondary")}
                <ArrowDownIcon data-icon="inline-end" />
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("trust")}</p>
        </div>
        <InvitationPreview locale={locale} />
      </div>
    </section>
  );
}
