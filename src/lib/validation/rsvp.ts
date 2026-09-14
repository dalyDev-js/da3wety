import { RSVP_STATUSES } from "@/db/schema/enums";

import { formString, optionalText } from "./form";
import { EgyptianPhone } from "./phone";
import { VALIDATION_KEYS, z } from "./zod-config";

const seats = z.coerce
  .number()
  .int()
  .min(1, { error: VALIDATION_KEYS.tooSmall })
  .max(20, { error: VALIDATION_KEYS.tooLarge });

/** A guest with a personal link answers the invitation. */
export const personalRsvpSchema = z.object({
  status: z.enum(RSVP_STATUSES, { error: VALIDATION_KEYS.required }),
  seats: seats.default(1),
  message: optionalText(300),
});

export type PersonalRsvpInput = z.input<typeof personalRsvpSchema>;

export function personalRsvpFromFormData(fd: FormData): PersonalRsvpInput {
  return {
    status: (formString(fd, "status") ?? "") as PersonalRsvpInput["status"],
    seats: formString(fd, "seats") ?? "1",
    message: formString(fd, "message"),
  };
}

/** Self-registration through the open public link. */
export const openRsvpSchema = z.object({
  name: z.string({ error: VALIDATION_KEYS.required }).trim().min(2, { error: VALIDATION_KEYS.tooShort }).max(80),
  phone: EgyptianPhone,
  status: z.enum(RSVP_STATUSES, { error: VALIDATION_KEYS.required }),
  seats: seats.default(1),
  message: optionalText(300),
  /** Honeypot: real browsers leave it empty. */
  website: z.string().max(0).optional(),
});

export type OpenRsvpInput = z.input<typeof openRsvpSchema>;

export function openRsvpFromFormData(fd: FormData): OpenRsvpInput {
  return {
    name: formString(fd, "name") ?? "",
    phone: formString(fd, "phone") ?? "",
    status: (formString(fd, "status") ?? "") as OpenRsvpInput["status"],
    seats: formString(fd, "seats") ?? "1",
    message: formString(fd, "message"),
    website: formString(fd, "website") ?? "",
  };
}
