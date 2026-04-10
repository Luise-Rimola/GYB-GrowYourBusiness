import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { submitArtifactEvaluationAction } from "@/app/actions";
import { getArtifactEvaluations } from "@/lib/artifactEvaluations";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function ArtifactEvaluatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; return_to?: string }>;
}) {
  const { id } = await params;
  const { saved, return_to } = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const artifact = await prisma.artifact.findUnique({ where: { id } });
  if (!artifact) notFound();
  const backHref = return_to?.trim() ? return_to : `/artifacts/${artifact.id}`;

  const evaluations = await getArtifactEvaluations(artifact.id);
  

  return (
    <div className="space-y-8">
      <Section
        title={`${t.artifacts.evaluateArtifact}: ${artifact.title}`}
        description={t.artifacts.evaluatePageDesc}
        actions={
          <Link
            href={backHref}
            className="rounded-xl border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
          >
            {locale === "de" ? "Zurück" : "Back"}
          </Link>
        }
      >
        <form
   action={submitArtifactEvaluationAction} className="space-y-5"
>
          <input type="hidden" name="artifact_id" value={artifact.id} />
          <input type="hidden" name="return_to" value={return_to ?? ""} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">Qualität der Antwort (1-5)</span>
              <select name="answer_quality" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1 - sehr schlecht</option>
                <option value="2">2 - schwach</option>
                <option value="3">3 - mittel</option>
                <option value="4">4 - gut</option>
                <option value="5">5 - sehr gut</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">Quellenqualität (1-5)</span>
              <select name="source_quality" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1 - unzuverlässig</option>
                <option value="2">2 - schwach</option>
                <option value="3">3 - okay</option>
                <option value="4">4 - gut</option>
                <option value="5">5 - sehr gut</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">Realistisch/umsetzbar (1-5)</span>
              <select name="realism" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1 - unrealistisch</option>
                <option value="2">2 - eher unrealistisch</option>
                <option value="3">3 - teilweise realistisch</option>
                <option value="4">4 - realistisch</option>
                <option value="5">5 - sehr realistisch</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">Verständlich formuliert (1-5)</span>
              <select name="clarity" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1 - unverständlich</option>
                <option value="2">2 - schwierig</option>
                <option value="3">3 - okay</option>
                <option value="4">4 - klar</option>
                <option value="5">5 - sehr klar</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-2 text-sm">
              <span className="font-medium">Struktur & Lesbarkeit (1-5)</span>
              <select name="structure" defaultValue="4" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2">
                <option value="1">1 - chaotisch</option>
                <option value="2">2 - schwach strukturiert</option>
                <option value="3">3 - teilweise strukturiert</option>
                <option value="4">4 - gut strukturiert</option>
                <option value="5">5 - sehr gut strukturiert</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Halluzination vorhanden?</span>
            <select name="hallucination_present" defaultValue="no" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 md:w-[320px]">
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Falls ja: Welche Halluzination / Ungenauigkeit?</span>
            <textarea name="hallucination_notes" rows={3} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Stärken des Dokuments</span>
            <textarea name="strengths" rows={3} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Schwächen des Dokuments</span>
            <textarea name="weaknesses" rows={3} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Verbesserungsvorschläge für die KI-Ausgabe</span>
            <textarea name="improvement_suggestions" rows={4} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
          </label>

          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{t.artifacts.evalEwSection}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{t.artifacts.evalEwIntro}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["ew_sensible", t.artifacts.evalEwSensible],
                  ["ew_clear", t.artifacts.evalEwClear],
                  ["ew_helpful", t.artifacts.evalEwHelpful],
                ] as const
              ).map(([name, label]) => (
                <label key={name} className="flex min-w-0 flex-col gap-2 text-sm">
                  <span className="font-medium">{label}</span>
                  <select name={name} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" defaultValue="">
                    <option value="">{t.artifacts.evalSkipOption}</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">{t.artifacts.evalEwNotes}</span>
              <textarea name="ew_notes" rows={2} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
            </label>
          </div>

          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{t.artifacts.evalIndSection}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{t.artifacts.evalIndIntro}</p>
            </div>
            <label className="flex min-w-0 max-w-md flex-col gap-2 text-sm">
              <span className="font-medium">{t.artifacts.evalIndRelevant}</span>
              <select name="ind_relevant" className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" defaultValue="">
                <option value="">{t.artifacts.evalSkipOption}</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">{t.artifacts.evalIndNotes}</span>
              <textarea name="ind_notes" rows={2} className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2" />
            </label>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              {t.artifacts.saveEvaluation}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Bisherige Evaluationen" description="Zuletzt gespeichert zuerst.">
        {saved === "1" && (
          <p className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            {t.artifacts.evaluationSaved}
          </p>
        )}
        {evaluations.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Noch keine Evaluation vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {evaluations.map((ev) => {
              const ew = ev as typeof ev & {
                ew_sensible?: number | null;
                ew_clear?: number | null;
                ew_helpful?: number | null;
                ew_notes?: string | null;
                ind_relevant?: number | null;
                ind_notes?: string | null;
              };
              const hasEw =
                ew.ew_sensible != null ||
                ew.ew_clear != null ||
                ew.ew_helpful != null ||
                (ew.ew_notes && ew.ew_notes.trim());
              const hasInd = ew.ind_relevant != null || (ew.ind_notes && ew.ind_notes.trim());
              return (
              <div key={ev.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
                <p className="font-medium">
                  Qualität {ev.answerQuality}/5 · Quellenqualität {ev.sourceQuality}/5 · Realismus {ev.realism}/5 · Verständlichkeit {ev.clarity}/5 · Struktur {ev.structure}/5
                </p>
                <p className="mt-1 text-[var(--muted)]">Halluzination: {ev.hallucinationPresent ? "Ja" : "Nein"}</p>
                {ev.hallucinationNotes && <p className="mt-2"><span className="font-medium">Hinweis:</span> {ev.hallucinationNotes}</p>}
                {ev.strengths && <p className="mt-2"><span className="font-medium">Stärken:</span> {ev.strengths}</p>}
                {ev.weaknesses && <p className="mt-1"><span className="font-medium">Schwächen:</span> {ev.weaknesses}</p>}
                {ev.improvementSuggestions && <p className="mt-1"><span className="font-medium">Verbesserung:</span> {ev.improvementSuggestions}</p>}
                {hasEw && (
                  <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                    <p className="font-medium text-[var(--foreground)]">{t.artifacts.evalEwSection}</p>
                    <ul className="mt-1 list-inside space-y-0.5 text-[var(--muted)]">
                      {ew.ew_sensible != null && (
                        <li>
                          {t.artifacts.evalEwSensible}: {ew.ew_sensible}/5
                        </li>
                      )}
                      {ew.ew_clear != null && (
                        <li>
                          {t.artifacts.evalEwClear}: {ew.ew_clear}/5
                        </li>
                      )}
                      {ew.ew_helpful != null && (
                        <li>
                          {t.artifacts.evalEwHelpful}: {ew.ew_helpful}/5
                        </li>
                      )}
                    </ul>
                    {ew.ew_notes && (
                      <p className="mt-1">
                        <span className="font-medium text-[var(--foreground)]">{t.artifacts.evalEwNotes}</span> {ew.ew_notes}
                      </p>
                    )}
                  </div>
                )}
                {hasInd && (
                  <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                    <p className="font-medium text-[var(--foreground)]">{t.artifacts.evalIndSection}</p>
                    {ew.ind_relevant != null && (
                      <p className="mt-1 text-[var(--muted)]">
                        {t.artifacts.evalIndRelevant}: {ew.ind_relevant}/5
                      </p>
                    )}
                    {ew.ind_notes && (
                      <p className="mt-1">
                        <span className="font-medium text-[var(--foreground)]">{t.artifacts.evalIndNotes}</span> {ew.ind_notes}
                      </p>
                    )}
                  </div>
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
