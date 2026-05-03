"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      const panel = panelRef.current;
      const target = e.target as Node;
      if (root && !root.contains(target) && (!panel || !panel.contains(target))) {
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

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const preferredWidth = size === "compact" ? 320 : 448;
      const maxAllowedWidth = Math.max(260, window.innerWidth - viewportPadding * 2);
      const width = Math.min(preferredWidth, maxAllowedWidth);
      let left = rect.right - width;
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - width - viewportPadding));
      const top = Math.min(rect.bottom + 8, window.innerHeight - viewportPadding);
      setPanelPos({ top, left, width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, size]);

  const triggerClasses =
    size === "compact"
      ? "rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900"
      : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900";

  const panelClasses =
    size === "compact"
      ? "z-[120] rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-xl dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100"
      : "z-[120] rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-xl dark:border-amber-800 dark:bg-amber-950/95 dark:text-amber-100";

  return (
    <div className="relative inline-block align-middle" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={triggerTitle}
        className={`cursor-pointer ${triggerClasses}`}
        onClick={() => setOpen((v) => !v)}
      >
        Frühwarnhinweis
      </button>
      {open && panelPos
        ? createPortal(
            <div
              ref={panelRef}
              className={`${panelClasses} fixed`}
              style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width, maxHeight: "min(60vh, 28rem)" }}
              role="dialog"
              aria-label={panelTitle}
            >
              <p className="font-semibold">{panelTitle}</p>
              {primaryRiskText ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{primaryRiskText}</p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 overflow-auto pl-4">
                  {detailMessages.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
