"use client";

import { ClipboardListIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { pendingLinksText } from "@/lib/share-text";

type Props = { rows: { name: string; link: string }[] };

export function CopyPendingLinks({ rows }: Props) {
  const t = useTranslations("Guests");
  async function copy() {
    try {
      await navigator.clipboard.writeText(pendingLinksText(rows));
      toast.success(t("copiedPending", { count: rows.length }));
    } catch {
      toast.error(t("copyPending"));
    }
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} disabled={rows.length === 0}>
      <ClipboardListIcon />
      {t("copyPending")}
    </Button>
  );
}
