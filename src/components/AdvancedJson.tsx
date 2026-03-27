import { ReactNode } from "react";
import { JsonViewer } from "@/components/JsonViewer";

type AdvancedJsonProps = {
  title?: string;
  data: unknown;
  summary?: ReactNode;
  /** Start expanded. Default false. */
  defaultOpen?: boolean;
};

export function AdvancedJson({ title = "Advanced", data, summary, defaultOpen }: AdvancedJsonProps) {
  return (
    <details className="group rounded-xl border border-[var(--card-border)]" open={defaultOpen}>
      <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50 dark:hover:bg-slate-900/30 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-[var(--muted)] transition group-open:rotate-90">▸</span>
          {summary ?? title}
        </span>
      </summary>
      <div className="border-t border-[var(--card-border)] p-4 pt-3">
        <JsonViewer data={data} collapsible={false} />
      </div>
    </details>
  );
}
