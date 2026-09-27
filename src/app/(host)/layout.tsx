import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { Providers } from "@/components/providers";
import { publicEnv } from "@/lib/env";
import { fontClassName } from "@/lib/fonts";
import { htmlLang, TEXT_DIRECTION, toAppLocale } from "@/lib/i18n/config";

import "@/app/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const [t, common] = await Promise.all([getTranslations("Landing"), getTranslations("Common")]);
  const locale = toAppLocale(await getLocale());
  const title = t("title");
  const description = t("description");
  const url = publicEnv().NEXT_PUBLIC_SITE_URL;

  return {
    metadataBase: new URL(url),
    title: { default: title, template: `%s | ${common("appName")}` },
    description,
    // Shared on WhatsApp and Facebook far more often than it is searched for.
    openGraph: {
      type: "website",
      siteName: common("appName"),
      locale: htmlLang(locale).replace("-", "_"),
      url,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf6ee",
};

/**
 * Root layout for the host surface (landing, login, dashboard, admin).
 * Language comes from the host's locale cookie (default Arabic).
 */
export default async function HostRootLayout({ children }: LayoutProps<"/">) {
  const locale = toAppLocale(await getLocale());
  const dir = TEXT_DIRECTION[locale];

  return (
    <html lang={htmlLang(locale)} dir={dir} className={`${fontClassName} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <NextIntlClientProvider>
          <Providers direction={dir}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
