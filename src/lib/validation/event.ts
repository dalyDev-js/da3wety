import { EVENT_TYPES, LOCALES, RSVP_MODES, THEME_IDS } from "@/db/schema/enums";
import { wallClockToUtc } from "@/lib/dates";

import { formCheckbox, formString, optionalText } from "./form";
import { VALIDATION_KEYS, z } from "./zod-config";

const DATETIME_LOCAL = z
  .string({ error: VALIDATION_KEYS.required })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/, { error: VALIDATION_KEYS.dateInvalid });

const IANA_ZONE = z.string().regex(/^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/, { error: VALIDATION_KEYS.invalid });

/** Shape of the host event form as submitted (all strings / booleans). */
export const eventFormSchema = z
  .object({
    title: z.string({ error: VALIDATION_KEYS.required }).trim().min(2, { error: VALIDATION_KEYS.tooShort }).max(120),
    eventType: z.enum(EVENT_TYPES),
    honoreePrimary: z
      .string({ error: VALIDATION_KEYS.required })
      .trim()
      .min(1, { error: VALIDATION_KEYS.required })
      .max(80),
    honoreeSecondary: optionalText(80),
    familyNames: optionalText(160),
    description: optionalText(2000),
    startsAt: DATETIME_LOCAL,
    endsAt: DATETIME_LOCAL.optional(),
    timezone: IANA_ZONE.default("Africa/Cairo"),
    venueName: optionalText(120),
    venueAddress: optionalText(300),
    venueMapsUrl: z.url({ error: VALIDATION_KEYS.urlInvalid }).optional(),
    locale: z.enum(LOCALES),
    rsvpMode: z.enum(RSVP_MODES),
    rsvpDeadline: DATETIME_LOCAL.optional(),
    openRsvpMaxSeats: z.coerce
      .number()
      .int()
      .min(1, { error: VALIDATION_KEYS.tooSmall })
      .max(10, { error: VALIDATION_KEYS.tooLarge }),
    galleryEnabled: z.boolean(),
    galleryModeration: z.boolean(),
    coverImagePath: optionalText(200),
    revealImagePath: optionalText(200),
    theme: z.enum(THEME_IDS).default("ivory"),
    giftEnabled: z.boolean(),
    giftHandle: optionalText(80),
    giftNote: optionalText(200),
  })
  .transform((v, ctx) => {
    const toInstant = (field: "startsAt" | "endsAt" | "rsvpDeadline"): Date | null => {
      const value = v[field];
      if (!value) return null;
      try {
        return wallClockToUtc(value, v.timezone);
      } catch {
        ctx.addIssue({ code: "custom", path: [field], message: VALIDATION_KEYS.dateInvalid });
        return null;
      }
    };

    const startsAt = toInstant("startsAt");
    const endsAt = toInstant("endsAt");
    const rsvpDeadline = toInstant("rsvpDeadline");

    if (startsAt && endsAt && endsAt <= startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: VALIDATION_KEYS.endBeforeStart });
    }

    if (v.giftEnabled && !v.giftHandle) {
      ctx.addIssue({ code: "custom", path: ["giftHandle"], message: VALIDATION_KEYS.required });
    }

    return {
      ...v,
      startsAt: startsAt as Date, // null only when an issue was added (parse fails)
      endsAt,
      rsvpDeadline,
      honoreeSecondary: v.honoreeSecondary ?? null,
      familyNames: v.familyNames ?? null,
      description: v.description ?? null,
      venueName: v.venueName ?? null,
      venueAddress: v.venueAddress ?? null,
      venueMapsUrl: v.venueMapsUrl ?? null,
      coverImagePath: v.coverImagePath ?? null,
      revealImagePath: v.revealImagePath ?? null,
      giftHandle: v.giftEnabled ? (v.giftHandle ?? null) : null,
      giftNote: v.giftEnabled ? (v.giftNote ?? null) : null,
    };
  });

export type EventFormInput = z.input<typeof eventFormSchema>;
export type EventFormValues = z.output<typeof eventFormSchema>;

/** Builds the schema input from a submitted FormData, explicitly per field. */
export function eventFormFromFormData(fd: FormData): EventFormInput {
  return {
    title: formString(fd, "title") ?? "",
    eventType: (formString(fd, "eventType") ?? "wedding") as EventFormInput["eventType"],
    honoreePrimary: formString(fd, "honoreePrimary") ?? "",
    honoreeSecondary: formString(fd, "honoreeSecondary"),
    familyNames: formString(fd, "familyNames"),
    description: formString(fd, "description"),
    startsAt: formString(fd, "startsAt") ?? "",
    endsAt: formString(fd, "endsAt"),
    timezone: formString(fd, "timezone") ?? "Africa/Cairo",
    venueName: formString(fd, "venueName"),
    venueAddress: formString(fd, "venueAddress"),
    venueMapsUrl: formString(fd, "venueMapsUrl"),
    locale: (formString(fd, "locale") ?? "ar") as EventFormInput["locale"],
    rsvpMode: (formString(fd, "rsvpMode") ?? "open") as EventFormInput["rsvpMode"],
    rsvpDeadline: formString(fd, "rsvpDeadline"),
    openRsvpMaxSeats: formString(fd, "openRsvpMaxSeats") ?? "2",
    galleryEnabled: formCheckbox(fd, "galleryEnabled"),
    galleryModeration: formCheckbox(fd, "galleryModeration"),
    coverImagePath: formString(fd, "coverImagePath"),
    revealImagePath: formString(fd, "revealImagePath"),
    theme: (formString(fd, "theme") ?? "ivory") as EventFormInput["theme"],
    giftEnabled: formCheckbox(fd, "giftEnabled"),
    giftHandle: formString(fd, "giftHandle"),
    giftNote: formString(fd, "giftNote"),
  };
}
