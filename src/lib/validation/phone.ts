import { VALIDATION_KEYS, z } from "./zod-config";
import { EGYPT_MOBILE_RE, normalizeEgyptianPhone, toE164 } from "@/lib/phone";

export { EGYPT_MOBILE_RE, maskPhone, normalizeEgyptianPhone, toE164, whatsappDigits } from "@/lib/phone";

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
