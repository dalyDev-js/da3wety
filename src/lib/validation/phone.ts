import { VALIDATION_KEYS, z } from "./zod-config";

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/** Egyptian mobile numbers: 010 (Vodafone), 011 (Etisalat), 012 (Orange), 015 (WE). */
export const EGYPT_MOBILE_RE = /^01[0125][0-9]{8}$/;

function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EASTERN_ARABIC_INDIC.indexOf(d)));
}

/**
 * Normalizes what people actually type: Arabic-Indic digits, spaces, dashes,
 * parentheses, and +20 / 0020 / 20 country prefixes. Returns the local 11-digit form
 * (01XXXXXXXXX) or the cleaned input if it does not look Egyptian (so validation fails).
 */
export function normalizeEgyptianPhone(input: string): string {
  const digits = toAsciiDigits(input).replace(/[^0-9+]/g, "");
  const withoutPlus = digits.startsWith("+") ? digits.slice(1) : digits;
  return withoutPlus.replace(/^(0020|20)(?=1[0-9]{9}$)/, "0");
}

/** Local form -> E.164 (+20…). */
export function toE164(localNumber: string): string {
  return `+20${localNumber.slice(1)}`;
}

/**
 * zod schema: accepts messy input, validates an Egyptian mobile, outputs E.164.
 * Error message is a validation key (see zod-config.ts).
 */
export const EgyptianPhone = z
  .string({ error: VALIDATION_KEYS.required })
  .transform((v) => normalizeEgyptianPhone(v))
  .pipe(z.string().regex(EGYPT_MOBILE_RE, { error: VALIDATION_KEYS.phoneInvalid }))
  .transform(toE164);

export type EgyptianPhoneInput = z.input<typeof EgyptianPhone>;

/** Digits only, for https://wa.me/<digits>. */
export function whatsappDigits(e164: string): string {
  return e164.replace(/[^0-9]/g, "");
}

/** Shows only the last three digits, e.g. for door staff. */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  return `•••• •••• ${e164.slice(-3)}`;
}
