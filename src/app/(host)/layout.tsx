import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { Providers } from "@/components/providers";
import { publicEnv } from "@/lib/env";
import { fontClassName } from "@/lib/fonts";
import { htmlLang, TEXT_DIRECTION, toAppLocale } from "@/lib/i18n/config";

import "@/app/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Landing");
  return {
    metadataBase: new URL(publicEnv().NEXT_PUBLIC_SITE_URL),
    title: {
      default: t("title"),
      template: "%s | Da3wety",
    },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
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
