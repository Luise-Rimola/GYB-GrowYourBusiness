"use client";

import { useEffect, useMemo, useState } from "react";
import { CollapsibleDetails } from "@/components/CollapsibleDetails";
import { fetchApi } from "@/lib/apiClient";
import { translations, type Locale } from "@/lib/i18n";

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

type StudyDownloadLink = { href: string; label: string };

function studyQuestionnaireLinks(lang: Locale): { numericCsv: StudyDownloadLink[]; openText: StudyDownloadLink[] } {
  const st = translations[lang].study;
  const isEn = lang === "en";
  return {
    numericCsv: [
      { href: `/api/study/export?part=fb1&lang=${lang}`, label: st.studyExportSpssFb1 },
      { href: `/api/study/export?part=survey_core_wide&lang=${lang}`, label: st.studyExportSpssF23 },
      { href: `/api/study/export?part=comparison_wide&lang=${lang}`, label: st.studyExportSpssFb4 },
      { href: `/api/study/export?part=fb5&lang=${lang}`, label: st.studyExportSpssFb5 },
      { href: `/api/study/export?part=full&lang=${lang}`, label: st.studyExportSpssFull },
    ],
    openText: [
      {
        href: `/api/study/export?part=qualitative_answers&lang=${lang}`,
        label: isEn ? "Open text answers (Excel)" : "Offene Textantworten (Excel)",
      },
      {
        href: `/api/export/open-answers?section=fb23&lang=${lang}`,
        label: isEn ? "Excel: FB2 & FB3 open answers only" : "Excel: FB2 & FB3 nur offene Antworten",
      },
      {
        href: `/api/export/open-answers?section=fb4&lang=${lang}`,
        label: isEn ? "Excel: FB4 open & interview text only" : "Excel: FB4 nur offene & Interview-Texte",
      },
      {
        href: `/api/study/export?part=export_schema&lang=${lang}`,
        label: isEn ? "Export schema (JSON)" : "Export-Schema (JSON)",
      },
    ],
  };
}

export function HomeExportPackageButton({ locale, autoOpen = false, showButton = true }: Props) {
  const isEn = locale === "en";
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const studyLinks = useMemo(() => studyQuestionnaireLinks(locale), [locale]);

  const otherEntries = useMemo<ExportEntry[]>(() => {
    const lang = isEn ? "en" : "de";
    return [
      { label: isEn ? "Document evaluation" : "Dokumente Evaluation", spss: `/api/export?scope=artifacts&format=spss&lang=${lang}&anon=1`, pdf: `/api/export?scope=artifacts&format=pdf&lang=${lang}&anon=1`, excel: `/api/export?scope=artifacts&format=excel&lang=${lang}&anon=1` },
      { label: isEn ? "Use case evaluation" : "Use Case Evaluation", spss: `/api/export?scope=usecase&format=spss&lang=${lang}&anon=1`, pdf: `/api/export?scope=usecase&format=pdf&lang=${lang}&anon=1`, excel: `/api/export?scope=usecase&format=excel&lang=${lang}&anon=1` },
      { label: isEn ? "Advisor evaluation" : "Berater Evaluation", spss: `/api/export?scope=advisor&format=spss&lang=${lang}&anon=1`, pdf: `/api/export?scope=advisor&format=pdf&lang=${lang}&anon=1`, excel: `/api/export?scope=advisor&format=excel&lang=${lang}&anon=1` },
    ];
  }, [isEn]);

  const studyPdfHref = `/api/export?scope=study&format=pdf&lang=${locale}&anon=1`;
  const studyExcelHref = `/api/export?scope=study&format=excel&lang=${locale}&anon=1`;

  const docsPdfZipLink = useMemo(() => `/api/export/documents-pdf-zip?lang=${isEn ? "en" : "de"}`, [isEn]);
  const docsExcelZipLink = useMemo(() => `/api/export/documents-excel-zip?lang=${isEn ? "en" : "de"}`, [isEn]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const sendViaResend = async () => {
    setMessage("");
    setSending(true);
    try {
      const res = await fetchApi("/api/export/send-package-email", {
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
    const qTitle = isEn ? "Questionnaires" : "Fragebögen";
    const qNumeric = studyLinks.numericCsv.map((l) => `- ${l.label}: ${base}${l.href}`);
    const qOpen = studyLinks.openText.map((l) => `- ${l.label}: ${base}${l.href}`);
    const questionnaireLines = [
      `${qTitle}:`,
      isEn ? "Numeric / wide CSV:" : "Zahlen- / Breit-CSV:",
      ...qNumeric,
      isEn ? "Open text & schema:" : "Freitext & Schema:",
      ...qOpen,
      `- PDF: ${base}${studyPdfHref}`,
      `- Excel: ${base}${studyExcelHref}`,
      "",
    ];
    const lines = otherEntries.flatMap((entry) => [
      `${entry.label}:`,
      `- SPSS: ${base}${entry.spss}`,
      `- PDF: ${base}${entry.pdf}`,
      `- Excel: ${base}${entry.excel}`,
      "",
    ]);
    const body = [
      isEn ? "Anonymized export package:" : "Anonymisiertes Exportpaket:",
      "",
      ...questionnaireLines,
      ...lines,
      `${isEn ? "All generated documents (PDF ZIP)" : "Alle erstellten Dokumente (PDF-ZIP)"}: ${base}${docsPdfZipLink}`,
      `${isEn ? "All generated documents (Excel ZIP)" : "Alle erstellten Dokumente (Excel-ZIP)"}: ${base}${docsExcelZipLink}`,
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
                ? "Questionnaires: separate CSV blocks (FB1, FB2/3 phases, FB4 comparison, FB5, full package), open-text exports, and one PDF/Excel overview. Other areas each offer SPSS/PDF/Excel, plus all created documents as PDF or Excel ZIP. Likert items in evaluation SPSS CSVs use the same 1–5 scale as in the app."
                : "Fragebögen: getrennte CSV-Blöcke (FB1, FB2/3-Phasen, FB4-Direktvergleich, FB5, Komplettpaket), Freitext-Exporte sowie ein gemeinsames PDF/Excel. Für die übrigen Bereiche jeweils SPSS/PDF/Excel plus alle erstellten Dokumente als ZIP. Likert-Werte in den Evaluations-SPSS-CSV-Dateien entsprechen der Skala 1–5 wie in der App."}
            </p>
            <CollapsibleDetails
              defaultOpen={false}
              className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30"
              summaryClassName="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-[var(--foreground)] [&::-webkit-details-marker]:hidden"
              contentClassName="border-t border-[var(--card-border)] px-4 pb-4 pt-3"
              label={isEn ? "Download individual evaluations" : "Einzelne Evaluationen herunterladen"}
            >
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-3">
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {isEn ? "Questionnaires" : "Fragebögen"}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {isEn
                      ? "Same sections as on the Study page: numeric CSV per block, then open-text Excel/JSON; PDF/Excel are the combined report."
                      : "Wie auf der Studien-Seite: zuerst Zahlen-CSV pro Block, dann Freitext-Excel/JSON; PDF/Excel sind der gemeinsame Bericht."}
                  </p>
                  <p className="mt-2 text-xs font-medium text-[var(--foreground)]">
                    {isEn ? "CSV (blocks)" : "CSV (Abschnitte)"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {studyLinks.numericCsv.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-medium text-[var(--foreground)]">
                    {isEn ? "Open text & schema" : "Freitext & Schema"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {studyLinks.openText.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-medium text-[var(--foreground)]">
                    {isEn ? "Combined report" : "Gesamtbericht"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <a href={studyPdfHref} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                      PDF
                    </a>
                    <a href={studyExcelHref} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                      Excel
                    </a>
                  </div>
                </div>
                {otherEntries.map((entry) => (
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
                    {isEn ? "All created documents (ZIP)" : "Alle erstellten Dokumente (ZIP)"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={docsPdfZipLink} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                      {isEn ? "PDF ZIP" : "PDF-ZIP"}
                    </a>
                    <a href={docsExcelZipLink} className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                      {isEn ? "Excel ZIP" : "Excel-ZIP"}
                    </a>
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
