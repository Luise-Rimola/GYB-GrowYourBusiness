"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/apiClient";

type Props = {
  locale: "de" | "en";
  labels: {
    button: string;
    loading: string;
  };
};

export function IntegratedInsightAnalysis({ locale, labels }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setText(null);
    try {
      const res = await fetchApi("/api/insights/integrated-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json()) as { analysis?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      if (data.analysis) setText(data.analysis);
      else setError(data.error ?? "—");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? labels.loading : labels.button}
      </button>
      {error && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}
      {text && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-[var(--background)] p-4 text-sm leading-relaxed text-[var(--foreground)] dark:border-zinc-700 whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
