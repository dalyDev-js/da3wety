import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  DEFAULT_TIME_ZONE,
  formats,
  INTL_LOCALE,
  LOCALE_COOKIE,
  isAppLocale,
  toAppLocale,
  type AppLocale,
} from "./config";

async function localeFromCookie(): Promise<AppLocale> {
  try {
    const value = (await cookies()).get(LOCALE_COOKIE)?.value;
    return isAppLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    // cookies() is unavailable in some contexts (e.g. static generation).
    return DEFAULT_LOCALE;
  }
}

/**
 * Resolution order:
 * 1. An explicit locale passed to getTranslations/getFormatter ({ locale }) — used by
 *    guest pages (event locale) and by every Server Action / Route Handler.
 * 2. The host's `locale` cookie.
 * 3. Arabic.
 *
 * Guest root layouts pass the event locale explicitly rather than relying on
 * next/root-params here, because root-param getters throw inside Server Actions
 * and Route Handlers.
 */
export default getRequestConfig(async ({ locale: requested }) => {
  const appLocale = requested ? toAppLocale(requested) : await localeFromCookie();
  const messages = (await import(`../../messages/${appLocale}.json`)).default;

  return {
    locale: INTL_LOCALE[appLocale],
    messages,
    timeZone: DEFAULT_TIME_ZONE,
    formats,
  };
});
