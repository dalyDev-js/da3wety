"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { submitOpenRsvp, submitPersonalRsvp, type RsvpActionState } from "@/actions/rsvp";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { RsvpStatus } from "@/db/schema/enums";
import { idleState, type FieldErrors } from "@/lib/validation/form";

type Props =
  | {
      mode: "personal";
      token: string;
      maxSeats: number;
      current: { status: RsvpStatus; seats: number; message: string | null } | null;
    }
  | { mode: "open"; slug: string; maxSeats: number };

function Err({ errors, field }: { errors?: FieldErrors; field: string }) {
  const list = errors?.[field];
  if (!list?.length) return null;
  return <FieldError errors={list.map((message) => ({ message }))} />;
}

/**
 * The answer card at the bottom of the invitation. Styled with the invitation
 * palette (CSS variables), not the dashboard theme.
 */
export function RsvpForm(props: Props) {
  const t = useTranslations("Rsvp");
  const common = useTranslations("Common");
  const action =
    props.mode === "personal" ? submitPersonalRsvp.bind(null, props.token) : submitOpenRsvp.bind(null, props.slug);
  const [state, formAction, pending] = useActionState(action, idleState as RsvpActionState);
  const initialStatus: RsvpStatus | "" = props.mode === "personal" && props.current ? props.current.status : "";
  const [status, setStatus] = useState<RsvpStatus | "">(initialStatus);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const invalid = (field: string) => Boolean(errors?.[field]?.length);
  const seatOptions = Array.from({ length: props.maxSeats }, (_, i) => i + 1);
  const current = props.mode === "personal" ? props.current : null;

  const choice = (value: RsvpStatus, label: string) => (
    <label
      className={`flex flex-1 cursor-pointer items-center justify-center rounded-full border px-4 py-3 text-base font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-(--inv-gold) ${
        status === value
          ? "border-(--inv-accent) bg-(--inv-accent) text-(--inv-paper)"
          : "border-(--inv-gold) bg-transparent text-(--inv-ink)"
      }`}
    >
      <input
        type="radio"
        name="status"
        value={value}
        className="sr-only"
        checked={status === value}
        onChange={() => setStatus(value)}
      />
      {label}
    </label>
  );

  return (
    <form action={formAction} className="mx-auto w-full max-w-sm space-y-5" noValidate aria-labelledby="rsvp-title">
      <h2 id="rsvp-title" className="text-center font-heading text-2xl">
        {current ? t("updateTitle") : t("title")}
      </h2>

      {state.status === "success" ? (
        <p
          role="status"
          className="rounded-lg border border-(--inv-gold) bg-(--inv-gold-soft)/40 px-4 py-3 text-center"
        >
          {state.data?.status === "declined" ? t("thanksDeclined") : t("thanksAttending")}
        </p>
      ) : null}
      {state.status === "error" && state.formError ? (
        <p role="alert" className="rounded-lg border border-(--inv-accent) px-4 py-3 text-center text-(--inv-accent)">
          {state.formError}
        </p>
      ) : null}

      {props.mode === "open" ? (
        <>
          <Field data-invalid={invalid("name")}>
            <FieldLabel htmlFor="rsvp-name">{t("name")}</FieldLabel>
            <Input
              id="rsvp-name"
              name="name"
              autoComplete="name"
              required
              maxLength={80}
              aria-invalid={invalid("name")}
              className="bg-white/60"
            />
            <Err errors={errors} field="name" />
          </Field>
          <Field data-invalid={invalid("phone")}>
            <FieldLabel htmlFor="rsvp-phone">{t("phone")}</FieldLabel>
            <Input
              id="rsvp-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="01012345678"
              required
              aria-invalid={invalid("phone")}
              className="bg-white/60 text-start"
            />
            <Err errors={errors} field="phone" />
          </Field>
          {/* Honeypot: hidden from people, filled by bots. */}
          <div className="absolute -start-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>
              website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </>
      ) : null}

      <Field data-invalid={invalid("status")}>
        <span className="sr-only">{t("question")}</span>
        <div className="flex gap-3">
          {choice("attending", t("attending"))}
          {choice("declined", t("declined"))}
        </div>
        <Err errors={errors} field="status" />
      </Field>

      {status === "attending" && props.maxSeats > 1 ? (
        <Field data-invalid={invalid("seats")}>
          <FieldLabel htmlFor="rsvp-seats">{t("seats")}</FieldLabel>
          <NativeSelect id="rsvp-seats" name="seats" defaultValue={String(current?.seats ?? 1)} className="bg-white/60">
            {seatOptions.map((n) => (
              <NativeSelectOption key={n} value={String(n)}>
                {common("seats", { count: n })}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Err errors={errors} field="seats" />
        </Field>
      ) : (
        <input type="hidden" name="seats" value="1" />
      )}

      <Field data-invalid={invalid("message")}>
        <FieldLabel htmlFor="rsvp-message">
          {t("message")} <span className="font-normal text-(--inv-muted)">({common("optional")})</span>
        </FieldLabel>
        <Textarea
          id="rsvp-message"
          name="message"
          rows={2}
          maxLength={300}
          defaultValue={current?.message ?? ""}
          className="bg-white/60"
        />
        <Err errors={errors} field="message" />
      </Field>

      <button
        type="submit"
        disabled={pending || status === ""}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-(--inv-accent) px-6 py-3.5 text-base font-semibold text-(--inv-paper) transition-opacity focus-visible:ring-2 focus-visible:ring-(--inv-gold) focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
      >
        {pending ? <Spinner /> : null}
        {current ? t("update") : t("send")}
      </button>
    </form>
  );
}
