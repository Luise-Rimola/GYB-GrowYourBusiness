"use client";

import { useMemo, useState } from "react";

type Props = {
  locale: "de" | "en";
  scenarioCount: number;
  useCaseCount: number;
};

export function EvaluationMailExportButton({ locale, scenarioCount, useCaseCount }: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState<string>("");
  const isEn = locale === "en";

  const links = useMemo(() => {
    const lang = isEn ? "en" : "de";
    return {
      spss: `/api/export?scope=evaluation&format=spss&lang=${lang}&anon=1`,
      pdf: `/api/export?scope=evaluation&format=pdf&lang=${lang}&anon=1`,
      excel: `/api/export?scope=evaluation&format=excel&lang=${lang}&anon=1`,
    };
  }, [isEn]);

  const openMailDraft = () => {
    if (typeof window === "undefined") return;
    const base = window.location.origin;
    const subject = isEn
      ? "Anonymized evaluation package (SPSS, PDF, Excel)"
      : "Anonymisiertes Evaluationspaket (SPSS, PDF, Excel)";
    const body = isEn
      ? [
          "Hello,",
          "",
          "attached/linked is the anonymized evaluation package:",
          "",
          `- SPSS (CSV): ${base}${links.spss}`,
          `- PDF report: ${base}${links.pdf}`,
          `- Excel (analysis + logs): ${base}${links.excel}`,
          "",
          `Included evaluations: scenarios=${scenarioCount}, use-cases=${useCaseCount}`,
        ].join("\n")
      : [
          "Hallo,",
          "",
          "hier ist das anonymisierte Evaluationspaket:",
          "",
          `- SPSS (CSV): ${base}${links.spss}`,
          `- PDF-Bericht: ${base}${links.pdf}`,
          `- Excel (Auswertung + Logs): ${base}${links.excel}`,
          "",
          `Enthaltene Evaluationen: Szenarien=${scenarioCount}, Use-Cases=${useCaseCount}`,
        ].join("\n");

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const sendViaResend = async () => {
    setSendMessage("");
    setSending(true);
    try {
      const res = await fetch("/api/evaluation/send-anonymized-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) {
        setSendMessage(data.error ?? (isEn ? "Sending failed." : "Versand fehlgeschlagen."));
        return;
      }
      setSendMessage(
        isEn
          ? `Sent successfully to ${data.to ?? "fixed recipient"}.`
          : `Erfolgreich versendet an ${data.to ?? "festen Empfänger"}.`
      );
    } catch {
      setSendMessage(isEn ? "Sending failed." : "Versand fehlgeschlagen.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-xl border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
      >
        {isEn ? "Send anonymized package by email" : "Anonymisiertes Paket per E-Mail senden"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {isEn ? "Anonymized evaluation package" : "Anonymisiertes Evaluationspaket"}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {isEn
                ? "All evaluation exports are bundled here in one structured set (SPSS, PDF, Excel)."
                : "Hier sind alle Evaluations-Exporte als strukturiertes Gesamtpaket (SPSS, PDF, Excel)."}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {isEn
                ? `Included evaluations: scenarios=${scenarioCount}, use-cases=${useCaseCount}`
                : `Enthaltene Evaluationen: Szenarien=${scenarioCount}, Use-Cases=${useCaseCount}`}
            </p>

            <div className="mt-4 space-y-3">
              <ExportRow label="SPSS (CSV)" href={links.spss} />
              <ExportRow label="PDF" href={links.pdf} />
              <ExportRow label="Excel" href={links.excel} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={sendViaResend}
                disabled={sending}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {sending
                  ? (isEn ? "Sending..." : "Wird gesendet...")
                  : (isEn ? "Send now via Resend" : "Jetzt per Resend senden")}
              </button>
              <button
                type="button"
                onClick={openMailDraft}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {isEn ? "Open email draft" : "E-Mail-Entwurf öffnen"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
              >
                {isEn ? "Close" : "Schließen"}
              </button>
            </div>
            {sendMessage && (
              <p className="mt-3 text-xs text-[var(--muted)]">{sendMessage}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ExportRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 px-3 py-2">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <a
        href={href}
        className="rounded-lg border border-teal-300 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-950/30"
      >
        Open
      </a>
    </div>
  );
}

