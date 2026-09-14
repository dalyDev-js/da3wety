"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  label: string;
  copiedLabel: string;
  size?: "sm" | "icon-sm";
};

export function CopyButton({ value, label, copiedLabel, size = "sm" }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(copiedLabel);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(value);
    }
  }

  return (
    <Button type="button" variant="outline" size={size} onClick={copy} aria-label={label}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {size === "sm" ? label : null}
    </Button>
  );
}
