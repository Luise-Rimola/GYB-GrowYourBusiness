"use client";

import { useRef, useState, type ReactNode } from "react";
import { ReadableDataView } from "@/components/ReadableDataView";

function formatArtifactPdfName(title: string, fallbackId: string): string {
  const s = title
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return s || `dokument-${fallbackId.slice(0, 8)}`;
}

/**
 * Bericht = Papier-Layout (wie PDF); PDF-Button lädt die Datei direkt herunter.
 */
export function ArtifactContentMode({
  data,
  reportSlot,
  defaultMode = "report",
  documentTitle,
  generatedAtIso,
  pdfFilenameBase,
  artifactId,
}: {
  data: Record<string, unknown>;
  reportSlot: ReactNode;
  defaultMode?: "report" | "data";
  documentTitle: string;
  generatedAtIso: string;
  /** Kurzname ohne .pdf (z. B. Artefakt-Titel) */
  pdfFilenameBase: string;
  artifactId: string;
}) {
  const [mode, setMode] = useState<"report" | "data">(defaultMode);
  const [pdfBusy, setPdfBusy] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const generatedLabel = (() => {
    try {
      const d = new Date(generatedAtIso);
      return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return generatedAtIso;
    }
  })();

  async function downloadPdf() {
    const el = captureRef.current;
    if (!el) return;
    setPdfBusy(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const safeName = formatArtifactPdfName(pdfFilenameBase, artifactId);
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `${safeName}.pdf`,
          image: { type: "jpeg", quality: 0.92 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            letterRendering: true,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
    } catch (e) {
      console.error(e);
      window.alert("PDF konnte nicht erzeugt werden. Bitte erneut versuchen oder einen anderen Browser nutzen.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("report")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              mode === "report"
                ? "bg-teal-600 text-white dark:bg-teal-600"
                : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Bericht
          </button>
          <button
            type="button"
            onClick={() => setMode("data")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              mode === "data"
                ? "bg-teal-600 text-white dark:bg-teal-600"
                : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Datenfelder
          </button>
        </div>
        {mode === "report" ? (
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={pdfBusy}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {pdfBusy ? "PDF wird erstellt…" : "PDF herunterladen"}
          </button>
        ) : null}
      </div>

      {mode === "report" ? (
        <div ref={captureRef} className="report-paper-shell mx-auto max-w-[210mm] px-5 py-6 sm:px-8 sm:py-8">
          <header className="border-b border-slate-200 pb-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-teal-800">BusinessDSS · Bericht</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{documentTitle}</h2>
            <p className="mt-1 text-xs text-slate-500">Erstellt: {generatedLabel}</p>
          </header>
          <div className="report-paper-body pt-6">{reportSlot}</div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <ReadableDataView data={data} collapsible={false} />
        </div>
      )}
    </div>
  );
}
