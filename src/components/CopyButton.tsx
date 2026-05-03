"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  onCopied?: () => void;
  /** Wenn true oder `text` leer: kein Klick (z. B. Prompt noch nicht geladen). */
  disabled?: boolean;
};

export function CopyButton({
  text,
  label = "Kopieren",
  copiedLabel = "Kopiert!",
  onCopied,
  disabled = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const isDisabled = disabled || !text.trim();

  async function handleCopy() {
    if (isDisabled) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isDisabled}
      className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-teal-50 hover:border-teal-200 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-teal-950/30 dark:hover:border-teal-800"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
