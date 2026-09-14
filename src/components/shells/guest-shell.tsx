import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { fontClassName } from "@/lib/fonts";
import { htmlLang, TEXT_DIRECTION, toIntlLocale, type AppLocale } from "@/lib/i18n/config";

import "@/app/globals.css";

const GUEST_NAMESPACES = [
  "Common",
  "Errors",
  "Validation",
  "Invitation",
  "Rsvp",
  "Ticket",
  "Gallery",
  "Scanner",
] as const;

type Props = {
  locale: AppLocale;
  children: ReactNode;
};

function pick<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): Partial<T> {
  const out: Partial<T> = {};
  for (const key of keys) {
    if (key in obj) out[key as keyof T] = obj[key as keyof T];
  }
  return out;
}

/**
 * Document shell shared by every guest root layout (invitation, ticket, scanner).
 * The locale is the event's, not the browser's. Only guest-facing message
 * namespaces are shipped to the client to keep the invitation page light.
 */
export async function GuestShell({ locale, children }: Props) {
  const dir = TEXT_DIRECTION[locale];
  const intlLocale = toIntlLocale(locale);
  const messages = await getMessages({ locale: intlLocale });

  return (
    <html lang={htmlLang(locale)} dir={dir} className={`${fontClassName} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={intlLocale} messages={pick(messages, GUEST_NAMESPACES)}>
          <Providers direction={dir}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
