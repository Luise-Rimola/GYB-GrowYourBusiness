import Link from "next/link";
import { submitFeatureEvaluationAction } from "@/app/actions";
import { AdvisorEvaluationExportLinks } from "@/components/AdvisorEvaluationExportLinks";
import { Section } from "@/components/Section";
import type { FeatureEvaluationKind, FeatureEvaluationRecord } from "@/lib/featureEvaluations";
import type { Locale } from "@/lib/i18n";

type Fv = {
  quality: string;
  sourceQuality: string;
  realism: string;
  clarity: string;
  structure: string;
  hallucLabel: string;
  hallucNo: string;
  hallucYes: string;
  hallucNotesLabel: string;
  strengths: string;
  weaknesses: string;
  improvements: string;
  historyTitle: string;
  historyDesc: string;
  save: string;
  saved: string;
  scoreLine: string;
  hallucShort: string;
};

type Props = {
  kind: FeatureEvaluationKind;
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  saved?: string;
  evaluations: FeatureEvaluationRecord[];
  emptyHistory: string;
  fv: Fv;
  /** Optional: Excel nur mit offenen Textfeldern (Berater-Evaluation). */
  openTextExcelHref?: string;
  openTextExcelLabel?: string;
  /** Optional: SPSS/PDF/Excel für `scope=advisor` (Likert + Metadaten, anonymisiert). */
  quantExportLinks?: {
    spss: string;
    pdf: string;
    excel: string;
    isEn: boolean;
  };
  /** Für Beschriftungen im Download-Bereich (wenn kein quantExportLinks). */
  downloadsLocale?: Locale;
  /** Wenn false: kein Zurück-Link (z. B. eingebettet in Reiter auf `/chat`). Standard: true. */
  showBackLink?: boolean;
};

function scoreLineFromTemplate(tpl: string, ev: FeatureEvaluationRecord) {
  return tpl
    .replace("{q}", String(ev.answerQuality))
    .replace("{s}", String(ev.sourceQuality))
    .replace("{r}", String(ev.realism))
    .replace("{c}", String(ev.clarity))
    .replace("{st}", String(ev.structure));
}

export function FeatureEvaluationEvaluateContent({
  kind,
  title,
  description,
  backHref,
  backLabel,
  saved,
  evaluations,
  emptyHistory,
  fv,
  openTextExcelHref,
  openTextExcelLabel,
  quantExportLinks,
  downloadsLocale,
  showBackLink = true,
}: Props) {
  const downloadIsEn = quantExportLinks?.isEn ?? downloadsLocale === "en";
  return (
    <div className="space-y-8">
      <Section
        title={title}
        description={description}
        actions={
          showBackLink || quantExportLinks || openTextExcelHref ? (
            <div className="flex max-w-[min(100%,42rem)] flex-col items-stretch gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {showBackLink ? (
                <Link
                  href={backHref}
                  className="inline-flex justify-center rounded-xl border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50 sm:order-2"
                >
                  {backLabel}
                </Link>
              ) : null}
              {(quantExportLinks || openTextExcelHref) && (
                <div className="flex flex-wrap justify-center gap-2 sm:order-1 sm:justify-end">
                  <AdvisorEvaluationExportLinks
                    quant={quantExportLinks}
                    openTextExcelHref={openTextExcelHref}
                    openTextExcelLabel={openTextExcelLabel}
                    variant="compact"
                  />
                </div>
              )}
            </div>
          ) : undefined
        }
      >
        <form action={submitFeatureEvaluationAction} className="space-y-5">
          <input type="hidden" name="feature_kind" value={kind} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">{fv.quality}</span>
              <select name="answer_quality" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">{fv.sourceQuality}</span>
              <select name="source_quality" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">{fv.realism}</span>
              <select name="realism" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">{fv.clarity}</span>
              <select name="clarity" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm md:col-span-2">
              <span className="font-medium">{fv.structure}</span>
              <select name="structure" defaultValue="4" className="w-full max-w-md rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">{fv.hallucLabel}</span>
            <select name="hallucination_present" defaultValue="no" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 md:w-[320px]">
              <option value="no">{fv.hallucNo}</option>
              <option value="yes">{fv.hallucYes}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">{fv.hallucNotesLabel}</span>
            <textarea name="hallucination_notes" rows={3} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">{fv.strengths}</span>
            <textarea name="strengths" rows={3} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">{fv.weaknesses}</span>
            <textarea name="weaknesses" rows={3} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">{fv.improvements}</span>
            <textarea name="improvement_suggestions" rows={4} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <div className="pt-1">
            <button type="submit" className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
              {fv.save}
            </button>
          </div>
        </form>

        {(quantExportLinks || openTextExcelHref) && (
          <div className="mt-8 border-t border-[var(--card-border)] pt-6">
            <p className="mb-1 text-sm font-semibold text-[var(--foreground)]">
              {downloadIsEn ? "Downloads for analysis" : "Downloads zur Auswertung"}
            </p>
            <p className="mb-3 text-xs text-[var(--muted)]">
              {quantExportLinks
                ? downloadIsEn
                  ? "SPSS: CSV with numeric ratings. PDF: tables + context. Excel: HTML table. Open-text Excel: free-text fields only (anon=1 uses anonymized labels)."
                  : "SPSS: CSV mit numerischen Bewertungen. PDF: Tabellen + Kontext. Excel: HTML-Tabelle. Excel Freitext: nur offene Textfelder (anon=1 = anonymisierte Kennungen)."
                : downloadIsEn
                  ? "Open-text Excel: free-text fields only."
                  : "Excel Freitext: nur offene Textfelder."}
            </p>
            <div className="mb-1">
              <AdvisorEvaluationExportLinks
                quant={quantExportLinks}
                openTextExcelHref={openTextExcelHref}
                openTextExcelLabel={openTextExcelLabel}
                variant="default"
              />
            </div>
          </div>
        )}
      </Section>

      <Section title={fv.historyTitle} description={fv.historyDesc}>
        {saved === "1" && (
          <p className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            {fv.saved}
          </p>
        )}
        {evaluations.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{emptyHistory}</p>
        ) : (
          <div className="space-y-3">
            {evaluations.map((ev) => {
              const hall = Boolean(ev.hallucinationPresent);
              return (
                <div key={ev.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
                  <p className="font-medium">{scoreLineFromTemplate(fv.scoreLine, ev)}</p>
                  <p className="mt-1 text-[var(--muted)]">
                    {fv.hallucShort} {hall ? fv.hallucYes : fv.hallucNo}
                  </p>
                  {ev.hallucinationNotes && (
                    <p className="mt-2">
                      <span className="font-medium">{fv.hallucNotesLabel}</span> {ev.hallucinationNotes}
                    </p>
                  )}
                  {ev.strengths && (
                    <p className="mt-2">
                      <span className="font-medium">{fv.strengths}:</span> {ev.strengths}
                    </p>
                  )}
                  {ev.weaknesses && (
                    <p className="mt-1">
                      <span className="font-medium">{fv.weaknesses}:</span> {ev.weaknesses}
                    </p>
                  )}
                  {ev.improvementSuggestions && (
                    <p className="mt-1">
                      <span className="font-medium">{fv.improvements}:</span> {ev.improvementSuggestions}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
