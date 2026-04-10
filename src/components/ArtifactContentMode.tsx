"use client";

import { useRef, useState, type ReactNode } from "react";
import { ReadableDataView } from "@/components/ReadableDataView";
import { REPORT_HEADER_LINE } from "@/lib/reportBranding";
import { useRouter } from "next/navigation";

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
  locale = "de",
}: {
  data: Record<string, unknown>;
  reportSlot: ReactNode;
  defaultMode?: "report" | "data";
  documentTitle: string;
  generatedAtIso: string;
  /** Kurzname ohne .pdf (z. B. Artefakt-Titel) */
  pdfFilenameBase: string;
  artifactId: string;
  locale?: "de" | "en";
}) {
  const [mode, setMode] = useState<"report" | "data">(defaultMode);
  const [pdfBusy, setPdfBusy] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const generatedLabel = (() => {
    try {
      const d = new Date(generatedAtIso);
      return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", { day: "numeric", month: "long", year: "numeric" });
    } catch {
      return generatedAtIso;
    }
  })();

  const isDe = locale === "de";

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
      window.alert(
        isDe
          ? "PDF konnte nicht erzeugt werden. Bitte erneut versuchen oder einen anderen Browser nutzen."
          : "Could not generate PDF. Please try again or use a different browser."
      );
    } finally {
      setPdfBusy(false);
    }
  }
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/assistant"); // fallback
    }
  }
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] pb-3">
        <div className="flex flex-wrap gap-2">
        <button
            type="button"
            onClick={() => handleBack()}
           className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--muted)] transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
          {isDe ? "← Züruck" : "Back"} 
         </button>
          
          

        </div>
        {mode === "report" ? (
          <button
            type="button"
            onClick={() => void downloadPdf()}
            disabled={pdfBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:bg-[var(--card)] dark:hover:bg-slate-900/40"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path d="M10 3v8m0 0 3-3m-3 3-3-3M4 13.5v1A1.5 1.5 0 0 0 5.5 16h9A1.5 1.5 0 0 0 16 14.5v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {pdfBusy ? (isDe ? "PDF wird erstellt..." : "Generating PDF...") : (isDe ? "PDF herunterladen" : "Download PDF")}
          </button>
        ) : null}
      </div>

      {mode === "report" ? (
        <div ref={captureRef} className="report-paper-shell mx-auto max-w-[210mm] px-5 py-6 sm:px-8 sm:py-8">
          <header className="border-b border-slate-200 pb-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-teal-800">{REPORT_HEADER_LINE}</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{documentTitle}</h2>
            <p className="mt-1 text-xs text-slate-500">{isDe ? "Erstellt" : "Generated"}: {generatedLabel}</p>
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
