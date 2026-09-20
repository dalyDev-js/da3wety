import { getLocale } from "next-intl/server";

import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ThemeStrip } from "@/components/marketing/theme-strip";
import { toAppLocale } from "@/lib/i18n/config";

/** Marketing landing: every section is a server component; only the locale toggle and FAQ accordion hydrate. */
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
        <Pricing />
        <Faq locale={locale} />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
