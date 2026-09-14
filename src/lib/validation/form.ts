import type { ZodError } from "zod";
import { z } from "./zod-config";

/** Field errors as translation keys (from zod) or translated text (after mapping). */
export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState<TData = undefined> =
  | { status: "idle" }
  | { status: "success"; data?: TData; message?: string }
  | { status: "error"; formError?: string; fieldErrors?: FieldErrors };

export const idleState: ActionState<never> = { status: "idle" };

export function fieldErrorsFromZod(error: ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/**
 * Maps validation keys to translated strings. `t` is a next-intl translator for the
 * `Validation` namespace; unknown keys fall back to the generic "invalid" message.
 */
export function translateFieldErrors(
  fieldErrors: FieldErrors,
  t: (key: string) => string,
  known: ReadonlySet<string>,
): FieldErrors {
  const out: FieldErrors = {};
  for (const [field, keys] of Object.entries(fieldErrors)) {
    if (!keys) continue;
    out[field] = keys.map((k) => (known.has(k) ? t(k) : t("invalid")));
  }
  return out;
}

/** FormData accessors that turn absent/blank values into undefined. */
export function formString(fd: FormData, name: string): string | undefined {
  const v = fd.get(name);
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function formCheckbox(fd: FormData, name: string): boolean {
  const v = fd.get(name);
  return v === "on" || v === "true" || v === "1";
}

/** Optional trimmed string with a max length; blank -> undefined. */
export const optionalText = (max: number) => z.string().trim().max(max).optional();
