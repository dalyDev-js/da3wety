import "server-only";

import { getTranslations } from "next-intl/server";
import type { ZodError } from "zod";

import type { AppLocale } from "@/lib/i18n/config";
import { toIntlLocale } from "@/lib/i18n/config";
import { FeatureLockedError } from "@/lib/packages";
import { RateLimitedError } from "@/lib/rate-limit";

import { fieldErrorsFromZod, translateFieldErrors, type ActionState } from "./form";
import { VALIDATION_KEYS, type ValidationKey } from "./zod-config";

const KNOWN_KEYS: ReadonlySet<string> = new Set(Object.values(VALIDATION_KEYS));

/**
 * Turns a zod error into a translated ActionState. Pass `locale` for guest actions
 * (the event's locale); host actions omit it and get the cookie locale.
 */
export async function validationError(error: ZodError, locale?: AppLocale): Promise<ActionState<never>> {
  const t = locale
    ? await getTranslations({ locale: toIntlLocale(locale), namespace: "Validation" })
    : await getTranslations("Validation");
  const translate = (key: string) => t(key as ValidationKey);
  return { status: "error", fieldErrors: translateFieldErrors(fieldErrorsFromZod(error), translate, KNOWN_KEYS) };
}

/** Maps known domain errors to a translated form-level message; rethrows the rest. */
export async function domainError(error: unknown, locale?: AppLocale): Promise<ActionState<never>> {
  const t = locale
    ? await getTranslations({ locale: toIntlLocale(locale), namespace: "Errors" })
    : await getTranslations("Errors");
  if (error instanceof FeatureLockedError) return { status: "error", formError: t("featureLocked") };
  if (error instanceof RateLimitedError) return { status: "error", formError: t("rateLimited") };
  throw error;
}
