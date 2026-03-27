"use client";

import { useEffect, useRef, useState } from "react";

export type EarlyWarningPopoverProps = {
  panelTitle: string;
  primaryRiskText?: string | null;
  detailMessages: string[];
  /** Kompakter Chip (Liste) vs. Standard (Artefakt-Header) */
  size?: "compact" | "default";
  triggerTitle?: string;
};

/**
 * Frühwarnhinweis als Popover: schließt bei Klick außerhalb und bei Escape.
 */
export function EarlyWarningPopover({
  panelTitle,
  primaryRiskText,
  detailMessages,
  size = "default",
  triggerTitle = "Klicken für Details zum Frühwarnhinweis",
}: EarlyWarningPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const triggerClasses =
    size === "compact"
      ? "rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900"
      : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900";

  const panelClasses =
    size === "compact"
      ? "absolute right-0 z-[80] mt-2 w-80 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-xl dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100"
      : "absolute right-0 z-[80] mt-2 w-[28rem] max-w-[90vw] rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-xl dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100";

  return (
    <div className="relative inline-block align-middle" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={triggerTitle}
        className={`cursor-pointer ${triggerClasses}`}
        onClick={() => setOpen((v) => !v)}
      >
        Frühwarnhinweis
      </button>
      {open ? (
        <div
          className={panelClasses}
          role="dialog"
          aria-label={panelTitle}
        >
          <p className="font-semibold">{panelTitle}</p>
          {primaryRiskText ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{primaryRiskText}</p>
          ) : (
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {detailMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
