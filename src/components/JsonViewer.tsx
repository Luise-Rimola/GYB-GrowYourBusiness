"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";

const JsonView = dynamic(
  () => import("@uiw/react-json-view").then((mod) => mod.default),
  { ssr: false }
);

type JsonViewerProps = {
  data: unknown;
  /** Wrap in collapsible details. Default true so JSON is expandable on every page. */
  collapsible?: boolean;
  /** Summary label when collapsible. Defaults to item count. */
  summary?: string;
};

function getItemCount(data: unknown): string {
  if (data === null || data === undefined) return "0 items";
  if (Array.isArray(data)) return `${data.length} items`;
  if (typeof data === "object") return `${Object.keys(data).length} items`;
  return "1 item";
}

/** Used to reset selection after content changes (@uiw/react-json-view Range / IndexSizeError). */
function stableValueSignature(o: object): string {
  try {
    return JSON.stringify(o);
  } catch {
    return `fallback:${Object.keys(o).sort().join(",")}`;
  }
}

export function JsonViewer({ data, collapsible = true, summary }: JsonViewerProps) {
  const value = useMemo<object>(
    () =>
      data === null || data === undefined
        ? {}
        : typeof data === "object"
          ? (data as object)
          : { value: data },
    [data]
  );

  const valueSignature = useMemo(() => stableValueSignature(value), [value]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        window.getSelection()?.removeAllRanges();
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [valueSignature]);

  const jsonContent = (
    <div className="rounded-lg bg-slate-50 p-4 text-xs text-[var(--foreground)] dark:bg-slate-900/30">
      <JsonView value={value} collapsed={2} displayDataTypes={false} />
    </div>
  );

  if (collapsible) {
    const label = summary ?? `View data (${getItemCount(data)})`;
    return (
      <details className="group rounded-xl border border-[var(--card-border)]" open>
        <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50 dark:hover:bg-slate-900/30 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-[var(--muted)] transition group-open:rotate-90">▸</span>
            {label}
          </span>
        </summary>
        <div className="border-t border-[var(--card-border)] p-4 pt-3">{jsonContent}</div>
      </details>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)]">
      {jsonContent}
    </div>
  );
}
