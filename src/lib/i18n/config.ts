import type { Formats } from "next-intl";

/**
 * Locale configuration shared by server and client code.
 * Keep this file free of server-only imports.
 *
 * Two notions of "locale" exist on purpose:
 * - AppLocale ("ar" | "en"): what the database, cookies and message files use.
 * - IntlLocale (full BCP 47 tag): what next-intl and Intl.* receive. The tag pins
 *   Western digits (`nu-latn`) so phone numbers, codes and plural counts render the
 *   same on the server and in every browser, whatever its ICU defaults are.
 */
export const APP_LOCALES = ["ar", "en"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "ar";

export const INTL_LOCALE = {
  ar: "ar-EG-u-nu-latn",
  en: "en-GB",
} as const satisfies Record<AppLocale, string>;
export type IntlLocale = (typeof INTL_LOCALE)[AppLocale];

/** Cookie that stores the host's dashboard language. */
export const LOCALE_COOKIE = "locale";

export const TEXT_DIRECTION: Record<AppLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

/** Default timezone for display; events carry their own `timezone` column. */
export const DEFAULT_TIME_ZONE = "Africa/Cairo";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}

/** Accepts "ar", "en", or a full Intl tag ("ar-EG-u-nu-latn") and returns the AppLocale. */
export function toAppLocale(value: unknown): AppLocale {
  if (isAppLocale(value)) return value;
  if (typeof value === "string") {
    const short = value.split("-")[0];
    if (isAppLocale(short)) return short;
  }
  return DEFAULT_LOCALE;
}

export function toIntlLocale(locale: AppLocale): IntlLocale {
  return INTL_LOCALE[locale];
}

/** Value for the `<html lang>` attribute (without Unicode extensions). */
export function htmlLang(locale: AppLocale): string {
  return new Intl.Locale(INTL_LOCALE[locale]).baseName;
}

/** Named formats usable as `format.dateTime(date, "eventDate")`. */
export const formats = {
  dateTime: {
    eventDate: {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      calendar: "gregory",
    },
    eventTime: {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    short: {
      day: "numeric",
      month: "short",
      year: "numeric",
      calendar: "gregory",
    },
    shortWithTime: {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      calendar: "gregory",
    },
  },
  number: {
    egp: { style: "currency", currency: "EGP", maximumFractionDigits: 0 },
  },
} satisfies Formats;
