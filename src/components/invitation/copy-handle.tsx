"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

type Props = { value: string; label: string; copiedLabel: string };

/** Copies the gift handle; falls back to selecting the text when the clipboard is blocked. */
export function CopyHandle({ value, label, copiedLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const range = document.createRange();
      const el = document.getElementById("gift-handle");
      if (el) {
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-(--inv-gold) px-4 py-2 text-sm text-(--inv-accent) hover:bg-(--inv-gold-soft)/40 focus-visible:ring-2 focus-visible:ring-(--inv-gold) focus-visible:outline-none"
    >
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
