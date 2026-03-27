"use client";

import { useState } from "react";
import Link from "next/link";
import { getScenarioById, SCENARIO_CATEGORIES } from "@/lib/scenarios";

type ScenarioEval = {
  id: string;
  scenarioId: number;
  userAnswer: string;
  userConfidence: number;
  aiAnswer: string | null;
  aiConfidence: number | null;
  userPrefers: string | null;
  userConfidenceInAi: number | null;
  userEvaluationJson: unknown;
  createdAt: Date;
};

type UseCaseEval = {
  id: string;
  useCaseDescription: string;
  userDecisionApproach: string;
  questionnaireJson: unknown;
  createdAt: Date;
};

type EvaluationOverviewTableProps = {
  scenarioEvals: ScenarioEval[];
  useCaseEvals: UseCaseEval[];
  t: {
    overviewDate: string;
    overviewScenario: string;
    overviewUseCase: string;
    overviewQuestion: string;
    overviewUserPrefers: string;
    preferUser: string;
    preferAi: string;
    evalUserConfidence: string;
    evalVerstaendlichkeit: string;
    evalRelevanz: string;
    evalNuetzlichkeit: string;
    evalVollstaendigkeit: string;
    evalNachvollziehbarkeit: string;
    evalPraktikabilitaet: string;
    evalVertrauen: string;
    evalQuellenqualitaet: string;
    deleteBtn: string;
    deleteConfirmTitle: string;
    deleteConfirmText: string;
    deleteConfirmCancel: string;
    deleteConfirmOk: string;
  };
  onDeleteScenario: (id: string) => Promise<void>;
  onDeleteUseCase: (id: string) => Promise<void>;
};

export function EvaluationOverviewTable({
  scenarioEvals,
  useCaseEvals,
  t,
  onDeleteScenario,
  onDeleteUseCase,
}: EvaluationOverviewTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ type: "scenario" | "usecase"; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const oneWord = (value: string | null | undefined) => {
    const s = (value ?? "").trim();
    if (!s) return "–";
    const shortMatch = s.match(/(?:^|\n)\s*\*{0,2}\s*(?:Kurzantwort|Short answer)\s*\*{0,2}\s*:\s*([^\s.,;:!?]+)/i);
    if (shortMatch?.[1]) return shortMatch[1].trim();
    const cleaned = s.replace(/\*/g, "").trim();
    if (/^empfehlung\s*:/i.test(cleaned)) return "–";
    return cleaned.split(/\s+/)[0];
  };
  const extractConfidenceFromText = (value: string | null | undefined): number | null => {
    const s = (value ?? "").trim();
    if (!s) return null;
    const matches = Array.from(s.matchAll(/(?:Konfidenz|Confidence)[^0-9\n]{0,12}(\d{1,3})\s*%?/gim));
    const m = matches.at(-1);
    if (!m?.[1]) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(100, Math.round(n)));
  };
  const withConf = (answer: string | null | undefined, confidence: number | null | undefined) =>
    answer && confidence != null ? `${answer} (${confidence}%)` : answer ?? "–";

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    // Popup sofort schließen, weil Server-Actions (mit `redirect`) ggf. vor dem Code nach `await` abbrechen.
    const target = deleteTarget;
    setDeleteTarget(null);
    setDeleting(true);
    try {
      if (target.type === "scenario") {
        await onDeleteScenario(target.id);
      } else {
        await onDeleteUseCase(target.id);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.overviewDate}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">Typ</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.overviewQuestion}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.overviewUserPrefers}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">User-Antwort</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">KI-Antwort</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">Konfidenz in KI</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalVerstaendlichkeit}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalRelevanz}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalNuetzlichkeit}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalVollstaendigkeit}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalNachvollziehbarkeit}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalPraktikabilitaet}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalVertrauen}</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.evalQuellenqualitaet}</th>
              <th className="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {scenarioEvals.map((ev) => {
              const scenario = getScenarioById(ev.scenarioId);
              const userEval = ev.userEvaluationJson as {
                verstaendlichkeit?: number;
                relevanz?: number;
                nuetzlichkeit?: number;
                vollstaendigkeit?: number;
                nachvollziehbarkeit?: number;
                praktikabilitaet?: number;
                vertrauen?: number;
                quellenqualitaet?: number;
              } | null;
              return (
                <tr key={ev.id} className="border-b border-[var(--card-border)] hover:bg-[var(--background)]/50">
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(ev.createdAt).toLocaleDateString("de-DE", { dateStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/evaluation/scenario/${ev.id}`}
                      className="inline-block rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 transition hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-200 dark:hover:bg-teal-800/50"
                    >
                      {scenario ? SCENARIO_CATEGORIES[scenario.category] : `#${ev.scenarioId}`}
                    </Link>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2" title={scenario?.question ?? ""}>
                      {scenario?.question ?? `#${ev.scenarioId}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {ev.userPrefers === "user" ? t.preferUser : ev.userPrefers === "ai" ? t.preferAi : "–"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{withConf(oneWord(ev.userAnswer), ev.userConfidence)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {withConf(oneWord(ev.aiAnswer), extractConfidenceFromText(ev.aiAnswer) ?? ev.aiConfidence)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{ev.userConfidenceInAi != null ? `${ev.userConfidenceInAi}%` : "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.verstaendlichkeit ?? "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.relevanz ?? "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.nuetzlichkeit ?? "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.vollstaendigkeit ?? "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.nachvollziehbarkeit ?? "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.praktikabilitaet ?? "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.vertrauen ?? "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{userEval?.quellenqualitaet ?? "–"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "scenario", id: ev.id })}
                      className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    >
                      {t.deleteBtn}
                    </button>
                  </td>
                </tr>
              );
            })}
            {useCaseEvals.map((ev) => {
              const q = (ev.questionnaireJson ?? {}) as {
                userOneWord?: string;
                userOneWordConfidence?: number;
                aiOneWord?: string;
                aiOneWordConfidence?: number;
                userConfidenceInAi?: number;
              };
              return (
                <tr key={ev.id} className="border-b border-[var(--card-border)] hover:bg-[var(--background)]/50">
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(ev.createdAt).toLocaleDateString("de-DE", { dateStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/evaluation/usecase/${ev.id}`}
                      className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {t.overviewUseCase}
                    </Link>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2" title={ev.useCaseDescription}>
                      {ev.useCaseDescription}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">{withConf(q.userOneWord ?? null, q.userOneWordConfidence ?? null)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{withConf(q.aiOneWord ?? null, q.aiOneWordConfidence ?? null)}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{q.userConfidenceInAi != null ? `${q.userConfidenceInAi}%` : "–"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3 text-[var(--muted)]">–</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "usecase", id: ev.id })}
                      className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    >
                      {t.deleteBtn}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{t.deleteConfirmTitle}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{t.deleteConfirmText}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--background)] disabled:opacity-50"
              >
                {t.deleteConfirmCancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? "…" : t.deleteConfirmOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
