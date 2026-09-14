"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { updateProfileLocale } from "@/db/queries/profiles";
import { currentProfile } from "@/lib/auth";
import { isAppLocale, LOCALE_COOKIE } from "@/lib/i18n/config";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Switches the host UI language. Persists to the cookie and, when signed in, the profile. */
export async function setLocale(locale: string): Promise<void> {
  if (!isAppLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: false,
  });

  const profile = await currentProfile();
  if (profile && profile.locale !== locale) {
    await updateProfileLocale(profile.id, locale);
  }

  revalidatePath("/", "layout");
}
