"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
};

export function CopyButton({ text, label = "Kopieren", copiedLabel = "Kopiert!" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-teal-50 hover:border-teal-200 dark:hover:bg-teal-950/30 dark:hover:border-teal-800"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
