import { formString, optionalText } from "./form";
import { EgyptianPhone, normalizeEgyptianPhone } from "./phone";
import { MAX_SEATS_PER_INVITATION } from "./state";
import { VALIDATION_KEYS, z } from "./zod-config";

export { MAX_SEATS_PER_INVITATION } from "./state";

const seats = z.coerce
  .number()
  .int()
  .min(1, { error: VALIDATION_KEYS.tooSmall })
  .max(MAX_SEATS_PER_INVITATION, { error: VALIDATION_KEYS.tooLarge });

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(EgyptianPhone.optional());

/** Host adds/edits one guest. */
export const guestFormSchema = z.object({
  name: z.string({ error: VALIDATION_KEYS.required }).trim().min(2, { error: VALIDATION_KEYS.tooShort }).max(80),
  phone: optionalPhone,
  maxSeats: seats.default(1),
  groupLabel: optionalText(60),
  notes: optionalText(500),
});

export type GuestFormInput = z.input<typeof guestFormSchema>;
export type GuestFormValues = z.output<typeof guestFormSchema>;

export function guestFormFromFormData(fd: FormData): GuestFormInput {
  return {
    name: formString(fd, "name") ?? "",
    phone: formString(fd, "phone"),
    maxSeats: formString(fd, "maxSeats") ?? "1",
    groupLabel: formString(fd, "groupLabel"),
    notes: formString(fd, "notes"),
  };
}

export type BulkGuestLine = { line: number; name: string; phone?: string; maxSeats: number; groupLabel?: string };
export type BulkParseResult = { guests: BulkGuestLine[]; errors: { line: number; key: string }[] };

/**
 * Parses "name, phone, seats, group" lines (phone/seats/group optional; Arabic or
 * Latin commas). Returns per-line errors as validation keys.
 */
export function parseBulkGuests(text: string, max = 500): BulkParseResult {
  const guests: BulkGuestLine[] = [];
  const errors: { line: number; key: string }[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (guests.length >= max) {
      errors.push({ line, key: VALIDATION_KEYS.tooLarge });
      return;
    }
    const parts = trimmed.split(/[,،\t]/).map((p) => p.trim());
    const [name, phoneRaw, seatsRaw, groupLabel] = parts;

    if (!name || name.length < 2) {
      errors.push({ line, key: VALIDATION_KEYS.tooShort });
      return;
    }

    let phone: string | undefined;
    if (phoneRaw) {
      const parsed = EgyptianPhone.safeParse(phoneRaw);
      if (!parsed.success) {
        errors.push({ line, key: VALIDATION_KEYS.phoneInvalid });
        return;
      }
      phone = parsed.data;
    }

    let maxSeats = 1;
    if (seatsRaw) {
      const n = Number(normalizeEgyptianPhone(seatsRaw));
      if (!Number.isInteger(n) || n < 1 || n > MAX_SEATS_PER_INVITATION) {
        errors.push({ line, key: VALIDATION_KEYS.seatsExceeded });
        return;
      }
      maxSeats = n;
    }

    guests.push({ line, name: name.slice(0, 80), phone, maxSeats, groupLabel: groupLabel?.slice(0, 60) || undefined });
  });

  return { guests, errors };
}
