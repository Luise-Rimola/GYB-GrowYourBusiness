"use client";

import { useEffect, useMemo, useState } from "react";
import { CollapsibleDetails } from "@/components/CollapsibleDetails";

type Props = {
  locale: "de" | "en";
  autoOpen?: boolean;
  showButton?: boolean;
};

type ExportEntry = {
  label: string;
  spss: string;
  pdf: string;
  excel: string;
};

export function HomeExportPackageButton({ locale, autoOpen = false, showButton = true }: Props) {
  const isEn = locale === "en";
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const entries = useMemo<ExportEntry[]>(() => {
    const lang = isEn ? "en" : "de";
    return [
      { label: isEn ? "Questionnaires" : "Fragebögen", spss: `/api/export?scope=study&format=spss&lang=${lang}&anon=1`, pdf: `/api/export?scope=study&format=pdf&lang=${lang}&anon=1`, excel: `/api/export?scope=study&format=excel&lang=${lang}&anon=1` },
      { label: isEn ? "Document evaluation" : "Dokumente Evaluation", spss: `/api/export?scope=artifacts&format=spss&lang=${lang}&anon=1`, pdf: `/api/export?scope=artifacts&format=pdf&lang=${lang}&anon=1`, excel: `/api/export?scope=artifacts&format=excel&lang=${lang}&anon=1` },
      { label: isEn ? "Use case evaluation" : "Use Case Evaluation", spss: `/api/export?scope=usecase&format=spss&lang=${lang}&anon=1`, pdf: `/api/export?scope=usecase&format=pdf&lang=${lang}&anon=1`, excel: `/api/export?scope=usecase&format=excel&lang=${lang}&anon=1` },
      { label: isEn ? "Advisor evaluation" : "Berater Evaluation", spss: `/api/export?scope=advisor&format=spss&lang=${lang}&anon=1`, pdf: `/api/export?scope=advisor&format=pdf&lang=${lang}&anon=1`, excel: `/api/export?scope=advisor&format=excel&lang=${lang}&anon=1` },
    ];
  }, [isEn]);

  const docsZipLink = useMemo(() => `/api/export/documents-pdf-zip?lang=${isEn ? "en" : "de"}`, [isEn]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const sendViaResend = async () => {
    setMessage("");
    setSending(true);
    try {
      const res = await fetch("/api/export/send-package-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) {
        setMessage(data.error ?? (isEn ? "Sending failed." : "Versand fehlgeschlagen."));
        return;
      }
      setMessage(isEn ? `Sent to ${data.to ?? "recipient"}.` : `An ${data.to ?? "Empfänger"} gesendet.`);
    } catch {
      setMessage(isEn ? "Sending failed." : "Versand fehlgeschlagen.");
    } finally {
      setSending(false);
    }
  };

  const openMailDraft = () => {
    if (typeof window === "undefined") return;
    const base = window.location.origin;
    const lines = entries.flatMap((entry) => [
      `${entry.label}:`,
      `- SPSS: ${base}${entry.spss}`,
      `- PDF: ${base}${entry.pdf}`,
      `- Excel: ${base}${entry.excel}`,
      "",
    ]);
    const body = [
      isEn ? "Anonymized export package:" : "Anonymisiertes Exportpaket:",
      "",
      ...lines,
      `${isEn ? "All generated documents (PDF ZIP)" : "Alle erstellten Dokumente (PDF ZIP)"}: ${base}${docsZipLink}`,
    ].join("\n");
    const subject = isEn ? "Full anonymized study package" : "Vollständiges anonymisiertes Studienpaket";
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <>
      {showButton ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/40"
        >
          {isEn ? "Evaluation package" : "Evaluationspaket"}
        </button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-4xl rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {isEn ? "Evaluation package" : "Evaluationspaket"}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {isEn
                ? "Questionnaires, document evaluation, use-case evaluation, advisor evaluation (each as SPSS/PDF/Excel), plus all created documents as PDF ZIP."
                : "Fragebögen, Dokumente-Evaluation, Use-Case-Evaluation, Berater-Evaluation (jeweils SPSS/PDF/Excel) plus alle erstellten Dokumente als PDF-ZIP."}
            </p>
            <CollapsibleDetails
              defaultOpen={false}
              className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30"
              summaryClassName="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden"
              contentClassName="border-t border-[var(--card-border)] px-4 pb-4 pt-3"
              label={isEn ? "Download individual evaluations" : "Einzelne Evaluationen herunterladen"}
            >
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.label} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-3">
                    <div className="text-sm font-semibold text-[var(--foreground)]">{entry.label}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a href={entry.spss} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">SPSS</a>
                      <a href={entry.pdf} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">PDF</a>
                      <a href={entry.excel} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">Excel</a>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-3">
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {isEn ? "All created documents as PDF ZIP" : "Alle erstellten Dokumente als PDF-ZIP"}
                  </div>
                  <div className="mt-2">
                    <a href={docsZipLink} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">ZIP</a>
                  </div>
                </div>
              </div>
            </CollapsibleDetails>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={sendViaResend} disabled={sending} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {sending
                  ? (isEn ? "Sending..." : "Wird gesendet...")
                  : isEn
                    ? "Send directly via Resend now"
                    : "Jetzt direkt per Resend senden"}
              </button>
              <button type="button" onClick={openMailDraft} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                {isEn ? "Open mail draft" : "Mail-Entwurf öffnen"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm">
                {isEn ? "Close" : "Schließen"}
              </button>
            </div>
            {message ? <p className="mt-3 text-xs text-[var(--muted)]">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
