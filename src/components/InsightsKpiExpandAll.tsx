"use client";

import { useRef, type ReactNode } from "react";

export function InsightsKpiExpandAll({
  children,
  openAllLabel,
  closeAllLabel,
}: {
  children: ReactNode;
  openAllLabel: string;
  closeAllLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function setAll(open: boolean) {
    ref.current?.querySelectorAll("details").forEach((d) => {
      (d as HTMLDetailsElement).open = open;
    });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="rounded-lg border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-900/50"
        >
          {openAllLabel}
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--background)]"
        >
          {closeAllLabel}
        </button>
      </div>
      <div ref={ref}>{children}</div>
    </div>
  );
}
