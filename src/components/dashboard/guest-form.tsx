"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { addGuest, updateGuest } from "@/actions/guests";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { Guest } from "@/db/schema";
import { MAX_SEATS_PER_INVITATION } from "@/lib/validation/guest";
import { idleState, type ActionState, type FieldErrors } from "@/lib/validation/form";

type Props = {
  eventId: string;
  guest?: Guest;
  onDone?: () => void;
};

function Err({ errors, field }: { errors?: FieldErrors; field: string }) {
  const list = errors?.[field];
  if (!list?.length) return null;
  return <FieldError errors={list.map((message) => ({ message }))} />;
}

export function GuestForm({ eventId, guest, onDone }: Props) {
  const t = useTranslations("Guests");
  const common = useTranslations("Common");
  const action = guest ? updateGuest.bind(null, eventId, guest.id) : addGuest.bind(null, eventId);
  const [state, formAction, pending] = useActionState(action, idleState as ActionState);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const invalid = (field: string) => Boolean(errors?.[field]?.length);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? common("save"));
      onDone?.();
    }
  }, [state, onDone, common]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.formError ? (
        <p role="alert" className="text-sm text-destructive">
          {state.formError}
        </p>
      ) : null}
      <FieldGroup>
        <Field data-invalid={invalid("name")}>
          <FieldLabel htmlFor="guest-name">{t("name")}</FieldLabel>
          <Input
            id="guest-name"
            name="name"
            defaultValue={guest?.name}
            required
            maxLength={80}
            autoFocus
            aria-invalid={invalid("name")}
          />
          <FieldDescription>{t("nameHint")}</FieldDescription>
          <Err errors={errors} field="name" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field data-invalid={invalid("phone")}>
            <FieldLabel htmlFor="guest-phone">
              {t("phone")} <span className="font-normal text-muted-foreground">({common("optional")})</span>
            </FieldLabel>
            <Input
              id="guest-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              placeholder="01012345678"
              defaultValue={guest?.phone ?? ""}
              aria-invalid={invalid("phone")}
              className="text-start"
            />
            <Err errors={errors} field="phone" />
          </Field>
          <Field data-invalid={invalid("maxSeats")}>
            <FieldLabel htmlFor="guest-seats">{t("maxSeats")}</FieldLabel>
            <Input
              id="guest-seats"
              name="maxSeats"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_SEATS_PER_INVITATION}
              defaultValue={guest?.maxSeats ?? 1}
              dir="ltr"
            />
            <Err errors={errors} field="maxSeats" />
          </Field>
        </div>
        <Field data-invalid={invalid("groupLabel")}>
          <FieldLabel htmlFor="guest-group">
            {t("groupLabel")} <span className="font-normal text-muted-foreground">({common("optional")})</span>
          </FieldLabel>
          <Input
            id="guest-group"
            name="groupLabel"
            defaultValue={guest?.groupLabel ?? ""}
            maxLength={60}
            placeholder={t("groupLabelHint")}
          />
        </Field>
        <Field data-invalid={invalid("notes")}>
          <FieldLabel htmlFor="guest-notes">
            {t("notes")} <span className="font-normal text-muted-foreground">({common("optional")})</span>
          </FieldLabel>
          <Textarea id="guest-notes" name="notes" rows={2} maxLength={500} defaultValue={guest?.notes ?? ""} />
          <FieldDescription>{t("notesHint")}</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {guest ? common("save") : t("add")}
        </Button>
      </div>
    </form>
  );
}
