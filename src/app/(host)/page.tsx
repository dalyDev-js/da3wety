import { getLocale } from "next-intl/server";

import { Hero } from "@/components/marketing/hero";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { toAppLocale } from "@/lib/i18n/config";

export default async function LandingPage() {
  const locale = toAppLocale(await getLocale());
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="flex-1">
        <Hero locale={locale} />
      </main>
      <SiteFooter />
    </>
  );
}
