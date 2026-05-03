import Link from "next/link";
import { submitFeatureEvaluationAction } from "@/app/actions";
import { Section } from "@/components/Section";
import type { FeatureEvaluationKind, FeatureEvaluationRecord } from "@/lib/featureEvaluations";

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
}: Props) {
  return (
    <div className="space-y-8">
      <Section
        title={title}
        description={description}
        actions={
          <Link
            href={backHref}
            className="rounded-xl border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
          >
            {backLabel}
          </Link>
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
        {openTextExcelHref && openTextExcelLabel ? (
          <div className="mt-4">
            <a
              href={openTextExcelHref}
              download
              className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--background)]"
            >
              {openTextExcelLabel}
            </a>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
