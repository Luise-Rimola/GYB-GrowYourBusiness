import type { ReactNode } from "react";

/**
 * Print-oriented “business paper” shell: title block + body slot.
 * Typography for children is refined via print.css on the print route.
 */
export function ReportPaperLayout({
  title,
  subtitle,
  generatedAt,
  children,
}: {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  children: ReactNode;
}) {
  return (
    <div className="report-paper-shell mx-auto max-w-[210mm] px-6 py-8 print:mx-0 print:max-w-none print:px-0 print:py-0">
      <header className="report-paper-header mb-8 border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">BusinessDSS · Bericht</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        <p className="mt-3 text-xs text-slate-500">
          Erstellt:{" "}
          {generatedAt.toLocaleDateString("de-DE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>
      <div className="report-paper-body">{children}</div>
    </div>
  );
}
