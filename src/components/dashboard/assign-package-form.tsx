"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { assignPackage } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PACKAGE_TIERS, type PackageTier } from "@/db/schema/enums";
import { idleState, type ActionState } from "@/lib/validation/form";

export function AssignPackageForm({ eventId, current }: { eventId: string; current: PackageTier }) {
  const t = useTranslations("Admin");
  const tEvent = useTranslations("Event");
  const [state, action, pending] = useActionState(assignPackage, idleState as ActionState);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="eventId" value={eventId} />
      <NativeSelect name="tier" defaultValue={current} className="w-32" aria-label={t("tier")}>
        {PACKAGE_TIERS.map((tier) => (
          <NativeSelectOption key={tier} value={tier}>
            {tEvent(`tiers.${tier}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Input
        name="amountEgp"
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={t("amount")}
        className="w-28"
        dir="ltr"
      />
      <Input name="note" placeholder={t("note")} className="w-40" maxLength={300} />
      <Button type="submit" size="sm" disabled={pending}>
        {t("assign")}
      </Button>
      {state.status === "success" ? <span className="text-xs text-emerald-700">{t("assigned")}</span> : null}
      {state.status === "error" ? <span className="text-xs text-destructive">{state.formError}</span> : null}
    </form>
  );
}
