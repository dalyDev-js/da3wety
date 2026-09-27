import { CheckIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { listPackages } from "@/db/queries/packages";
import type { Package } from "@/db/schema";
import { toAppLocale } from "@/lib/i18n/config";
import { packageHighlights, type PackageHighlight } from "@/lib/packages";
import { supportWhatsAppUrl } from "@/lib/whatsapp";

const POPULAR_TIER: Package["tier"] = "standard";

/** Live tiers from the `packages` table. A price of 0 renders as "contact us". */
export async function Pricing() {
  const [t, th, format, locale, packages] = await Promise.all([
    getTranslations("Landing.pricing"),
    getTranslations("Landing.pricing.highlights"),
    getFormatter(),
    getLocale(),
    listPackages(),
  ]);
  const appLocale = toAppLocale(locale);
  const whatsapp = supportWhatsAppUrl();

  function highlightLabel(h: PackageHighlight): { text: string; on: boolean } {
    switch (h.key) {
      case "guests":
        return { text: h.count === null ? th("guestsUnlimited") : th("guests", { count: h.count }), on: true };
      case "gallery":
        return { text: h.included ? th("galleryOn") : th("galleryOff"), on: h.included };
      case "photos":
        return { text: th("photos", { count: h.count }), on: true };
      case "retention":
        return { text: th("retention", { days: h.days }), on: true };
      case "moderation":
        return { text: h.included ? th("moderationOn") : th("moderationOff"), on: h.included };
      case "checkin":
        return { text: h.included ? th("checkinOn") : th("checkinOff"), on: h.included };
    }
  }

  return (
    <Section id="pricing" tone="card">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <ul className="mt-12 grid gap-6 lg:grid-cols-3">
        {packages
          .filter((p) => p.isActive)
          .map((pkg) => {
            const popular = pkg.tier === POPULAR_TIER;
            return (
              <li key={pkg.tier}>
                <Card data-tier={pkg.tier} className={popular ? "relative h-full ring-2 ring-gold" : "h-full"}>
                  {popular ? <Badge className="absolute start-4 -top-3 bg-gold text-ink">{t("popular")}</Badge> : null}
                  <CardHeader>
                    <CardTitle className="text-2xl">{appLocale === "ar" ? pkg.nameAr : pkg.nameEn}</CardTitle>
                    <CardDescription>
                      {pkg.priceEgp > 0 ? (
                        <span className="flex items-baseline gap-2">
                          <span className="font-heading text-4xl text-foreground" dir="ltr">
                            {format.number(pkg.priceEgp, "egp")}
                          </span>
                          <span>{t("perEvent")}</span>
                        </span>
                      ) : (
                        <span className="text-base">{t("contactForPrice")}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {packageHighlights(pkg).map((h) => {
                        const { text, on } = highlightLabel(h);
                        return (
                          <li
                            key={h.key}
                            className={on ? "flex items-center gap-2" : "flex items-center gap-2 text-muted-foreground"}
                          >
                            {on ? <CheckIcon className="size-4 text-primary" /> : <MinusIcon className="size-4" />}
                            {text}
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full" variant={popular ? "default" : "outline"}>
                      <Link href="/dashboard">{t("cta")}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
      </ul>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("note")}{" "}
        {whatsapp ? (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            WhatsApp
          </a>
        ) : null}
      </p>
    </Section>
  );
}
