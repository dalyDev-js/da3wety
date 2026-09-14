"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { addGuestsBulk, type BulkAddResult } from "@/actions/guests";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/validation/form";

export function BulkAddForm({ eventId, onDone }: { eventId: string; onDone?: () => void }) {
  const t = useTranslations("Guests");
  const [state, formAction, pending] = useActionState(addGuestsBulk.bind(null, eventId), idleState as BulkAddResult);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "");
      if (!state.data?.lineErrors.length) onDone?.();
    }
  }, [state, onDone]);

  const lineErrors = state.status === "success" ? state.data?.lineErrors ?? [] : [];
  const parseErrors = state.status === "error" ? state.fieldErrors?.lines ?? [] : [];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.status === "error" && state.formError ? (
        <p role="alert" className="text-destructive text-sm">
          {state.formError}
        </p>
      ) : null}
      <Field>
        <FieldLabel htmlFor="bulk-lines">{t("bulkLabel")}</FieldLabel>
        <Textarea id="bulk-lines" name="lines" rows={10} dir="auto" placeholder={t("bulkPlaceholder")} className="font-mono text-sm" />
        <FieldDescription>{t("bulkHint")}</FieldDescription>
      </Field>
      {parseErrors.length || lineErrors.length ? (
        <ul className="text-destructive max-h-40 space-y-1 overflow-y-auto text-sm">
          {parseErrors.map((message, i) => (
            <li key={`p${i}`}>{message}</li>
          ))}
          {lineErrors.map((e) => (
            <li key={`l${e.line}`}>{t("lineError", { line: e.line, message: e.message })}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {t("bulkSubmit")}
        </Button>
      </div>
    </form>
  );
}
