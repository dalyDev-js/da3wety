import { getLocale } from "next-intl/server";

import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ThemeStrip } from "@/components/marketing/theme-strip";
import { toAppLocale } from "@/lib/i18n/config";

export default async function LandingPage() {
  const locale = toAppLocale(await getLocale());
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="flex-1">
        <Hero locale={locale} />
        <FeatureGrid locale={locale} />
        <HowItWorks locale={locale} />
        <ThemeStrip locale={locale} />
      </main>
      <SiteFooter />
    </>
  );
}
