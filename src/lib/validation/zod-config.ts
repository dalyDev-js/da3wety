import { z } from "zod";

/**
 * Validation messages are message KEYS, not text. Server actions translate them with
 * next-intl (`Validation.*` namespace) in the event's or host's locale, so the same
 * schema serves Arabic and English pages. Import this module (for its side effect)
 * from every module that defines schemas.
 */
export const VALIDATION_KEYS = {
  required: "required",
  invalid: "invalid",
  tooShort: "tooShort",
  tooLong: "tooLong",
  tooSmall: "tooSmall",
  tooLarge: "tooLarge",
  phoneInvalid: "phoneInvalid",
  emailInvalid: "emailInvalid",
  urlInvalid: "urlInvalid",
  dateInvalid: "dateInvalid",
  endBeforeStart: "endBeforeStart",
  fileTooLarge: "fileTooLarge",
  fileType: "fileType",
  seatsExceeded: "seatsExceeded",
} as const;

export type ValidationKey = (typeof VALIDATION_KEYS)[keyof typeof VALIDATION_KEYS];

function defaultKey(issue: z.core.$ZodRawIssue): ValidationKey {
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined || issue.input === null || issue.input === ""
        ? VALIDATION_KEYS.required
        : VALIDATION_KEYS.invalid;
    case "too_small":
      return issue.origin === "string" || issue.origin === "array"
        ? issue.minimum === 1
          ? VALIDATION_KEYS.required
          : VALIDATION_KEYS.tooShort
        : VALIDATION_KEYS.tooSmall;
    case "too_big":
      return issue.origin === "string" || issue.origin === "array" ? VALIDATION_KEYS.tooLong : VALIDATION_KEYS.tooLarge;
    case "invalid_format":
      if (issue.format === "email") return VALIDATION_KEYS.emailInvalid;
      if (issue.format === "url") return VALIDATION_KEYS.urlInvalid;
      return VALIDATION_KEYS.invalid;
    default:
      return VALIDATION_KEYS.invalid;
  }
}

z.config({
  customError: (issue) => defaultKey(issue),
});

export { z };
