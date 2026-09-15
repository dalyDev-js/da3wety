/**
 * Server-action state shapes shared with client forms.
 * Deliberately zod-free: client components import from here, and anything that
 * imports zod (see ./form.ts) would drag the whole library into the guest bundle.
 */

/** Field errors as translation keys (from zod) or translated text (after mapping). */
export type FieldErrors = Record<string, string[] | undefined>;

export type ActionState<TData = undefined> =
  | { status: "idle" }
  | { status: "success"; data?: TData; message?: string }
  | { status: "error"; formError?: string; fieldErrors?: FieldErrors };

export const idleState: ActionState<never> = { status: "idle" };

/** Upper bound for seats on one invitation (form `max` and schema share it). */
export const MAX_SEATS_PER_INVITATION = 20;
