import type { formats, IntlLocale } from "@/lib/i18n/config";
import type messages from "@/messages/ar.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: IntlLocale;
    Messages: typeof messages;
    Formats: typeof formats;
  }
}
