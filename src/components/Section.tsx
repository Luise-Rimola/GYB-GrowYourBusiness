import { ReactNode } from "react";

type SectionProps = {
  title: string;
  description?: ReactNode;
  /** Actions/badges right-aligned next to title (extensible: add more via flex-wrap) */
  actions?: ReactNode;
  /** When true, description is in a collapsible <details>, always starts closed */
  descriptionCollapsible?: boolean;
  /** Label for collapsible description toggle (when descriptionCollapsible) */
  descriptionToggleLabel?: string;
  /** Less padding and spacing for a more compact header */
  compact?: boolean;
  children: ReactNode;
};

export function Section({ title, description, actions, descriptionCollapsible, descriptionToggleLabel = "Details anzeigen", compact, children }: SectionProps) {
  const hasHeader = title || description || actions;
  return (
    <section className={`rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50 ${compact ? "px-6 py-4" : "p-6"}`}>
      {hasHeader ? (
      <div className={compact ? "mb-0 space-y-1" : "mb-5 space-y-2"}>
        <div className="flex flex-wrap items-center justify-between gap-2 gap-y-1">
          {title ? <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2> : null}
          {actions ? (
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null}
        </div>
        {description ? (
          descriptionCollapsible ? (
            <details className={`group ${compact ? "mt-0.5" : ""}`}>
              <summary className={`cursor-pointer list-none text-[var(--muted)] transition hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden ${compact ? "py-0.5 text-xs" : "text-sm"}`}>
                <span className="inline-flex items-center gap-1">
                  <span className="transition group-open:rotate-90">▸</span>
                  {descriptionToggleLabel}
                </span>
              </summary>
              <div className="mt-2 text-sm text-[var(--muted)]">{description}</div>
            </details>
          ) : (
            <div className="text-sm text-[var(--muted)]">{description}</div>
          )
        ) : null}
      </div>
      ) : null}
      {children}
    </section>
  );
}
