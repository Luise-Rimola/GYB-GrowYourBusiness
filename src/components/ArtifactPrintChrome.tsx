"use client";

import Link from "next/link";

/**
 * Screen-only toolbar: back link + print / save-as-PDF (uses browser print dialog).
 */
export function ArtifactPrintChrome({ backHref }: { backHref: string }) {
  return (
    <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
        >
          ← Zurück zum Dokument
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            PDF speichern / Drucken
          </button>
          <p className="hidden text-xs text-slate-500 sm:block">
            Im Druckdialog „Als PDF speichern“ wählen
          </p>
        </div>
      </div>
    </div>
  );
}
