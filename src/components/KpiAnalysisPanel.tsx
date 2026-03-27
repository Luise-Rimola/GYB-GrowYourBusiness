"use client";

import { useState } from "react";

type KpiAnalysisPanelProps = {
  kpiKey: string;
  kpiName: string;
  kpiValues: Array<{ date: string; value: number; rawDate: Date | string }>;
  marketingActions: Array<{ actionDate: Date; description: string; category: string | null }>;
  runAnalysisAction: (kpiKey: string, userPrompt?: string) => Promise<string>;
  t: {
    title: string;
    description: string;
    promptPlaceholder: string;
    runButton: string;
    loading: string;
    noActions: string;
    noValues: string;
  };
};

export function KpiAnalysisPanel({
  kpiKey,
  kpiName,
  kpiValues,
  marketingActions,
  runAnalysisAction,
  t,
}: KpiAnalysisPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    setLoading(true);
    setResult(null);
    try {
      const analysis = await runAnalysisAction(kpiKey, prompt || undefined);
      setResult(analysis);
    } catch (err) {
      setResult(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
      <summary className="cursor-pointer list-none">
        <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">{t.title}</h2>
        <p className="mb-2 text-sm text-[var(--muted)]">{t.description}</p>
      </summary>

      {marketingActions.length === 0 && (
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">{t.noActions}</p>
      )}
      {kpiValues.length === 0 && (
        <p className="mb-3 text-xs text-amber-600 dark:text-amber-400">{t.noValues}</p>
      )}

      <div className="mb-4 space-y-2">
        <label htmlFor="analysis-prompt" className="block text-xs font-medium text-[var(--muted)]">
          Optional: Zusätzliche Frage oder Fokus
        </label>
        <textarea
          id="analysis-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t.promptPlaceholder}
          rows={2}
          className="w-full rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm dark:bg-[var(--background)]"
        />
      </div>

      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? t.loading : t.runButton}
      </button>

      {result && (
        <div className="mt-6 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Auswertung</h3>
          <div className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{result}</div>
        </div>
      )}
    </details>
  );
}
