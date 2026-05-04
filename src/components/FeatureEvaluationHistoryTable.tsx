import type { FeatureEvaluationRecord } from "@/lib/featureEvaluations";

export type FeatureEvaluationHistoryLabels = {
  empty: string;
  colDate: string;
  colAnswerQ: string;
  colSourceQ: string;
  colRealism: string;
  colClarity: string;
  colStructure: string;
  colHalluc: string;
  colHallucNotes: string;
  colStrengths: string;
  colWeaknesses: string;
  colImprove: string;
  hallucYes: string;
  hallucNo: string;
};

export function FeatureEvaluationHistoryTable({
  evaluations,
  labels,
  locale,
}: {
  evaluations: readonly FeatureEvaluationRecord[];
  labels: FeatureEvaluationHistoryLabels;
  locale: "de" | "en";
}) {
  const fmt = (d: string) =>
    new Date(d).toLocaleString(locale === "en" ? "en-US" : "de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  const clip = (s: string | null, n: number) => {
    if (!s) return "–";
    const t = s.trim();
    if (!t) return "–";
    return t.length <= n ? t : `${t.slice(0, n)}…`;
  };

  if (evaluations.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{labels.empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm text-zinc-900 dark:text-zinc-100">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{labels.colDate}</th>
            <th className="whitespace-nowrap px-2 py-2.5 text-center font-semibold">{labels.colAnswerQ}</th>
            <th className="whitespace-nowrap px-2 py-2.5 text-center font-semibold">{labels.colSourceQ}</th>
            <th className="whitespace-nowrap px-2 py-2.5 text-center font-semibold">{labels.colRealism}</th>
            <th className="whitespace-nowrap px-2 py-2.5 text-center font-semibold">{labels.colClarity}</th>
            <th className="whitespace-nowrap px-2 py-2.5 text-center font-semibold">{labels.colStructure}</th>
            <th className="whitespace-nowrap px-2 py-2.5 text-center font-semibold">{labels.colHalluc}</th>
            <th className="min-w-[120px] px-3 py-2.5 font-semibold">{labels.colHallucNotes}</th>
            <th className="min-w-[120px] px-3 py-2.5 font-semibold">{labels.colStrengths}</th>
            <th className="min-w-[120px] px-3 py-2.5 font-semibold">{labels.colWeaknesses}</th>
            <th className="min-w-[120px] px-3 py-2.5 font-semibold">{labels.colImprove}</th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((ev) => (
            <tr
              key={ev.id}
              className="border-b border-zinc-200 odd:bg-white even:bg-zinc-50/50 dark:border-zinc-800 dark:odd:bg-zinc-950 dark:even:bg-zinc-900/40"
            >
              <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{fmt(ev.createdAt)}</td>
              <td className="px-2 py-2 text-center tabular-nums">{ev.answerQuality}</td>
              <td className="px-2 py-2 text-center tabular-nums">{ev.sourceQuality}</td>
              <td className="px-2 py-2 text-center tabular-nums">{ev.realism}</td>
              <td className="px-2 py-2 text-center tabular-nums">{ev.clarity}</td>
              <td className="px-2 py-2 text-center tabular-nums">{ev.structure}</td>
              <td className="px-2 py-2 text-center text-xs">
                {ev.hallucinationPresent ? labels.hallucYes : labels.hallucNo}
              </td>
              <td className="max-w-[200px] px-3 py-2 align-top text-xs text-zinc-600 dark:text-zinc-400">
                {clip(ev.hallucinationNotes, 120)}
              </td>
              <td className="max-w-[200px] px-3 py-2 align-top text-xs text-zinc-600 dark:text-zinc-400">
                {clip(ev.strengths, 120)}
              </td>
              <td className="max-w-[200px] px-3 py-2 align-top text-xs text-zinc-600 dark:text-zinc-400">
                {clip(ev.weaknesses, 120)}
              </td>
              <td className="max-w-[200px] px-3 py-2 align-top text-xs text-zinc-600 dark:text-zinc-400">
                {clip(ev.improvementSuggestions, 120)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
