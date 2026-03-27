"use client";

export type KpiQuestionPlan = {
  questions_simple: string[];
  mapping_to_kpi_keys: string[];
  default_estimates_if_unknown: string[];
};

export function KpiQuestionsForm({
  plan,
  existingAnswers,
  submitAction,
  hiddenFields,
}: {
  plan: KpiQuestionPlan;
  existingAnswers: string[];
  submitAction: (formData: FormData) => Promise<void>;
  hiddenFields?: Record<string, string>;
}) {
  const { questions_simple, mapping_to_kpi_keys, default_estimates_if_unknown } = plan;
  const questions = questions_simple ?? [];
  const placeholders = default_estimates_if_unknown ?? [];

  if (questions.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        No questions were generated in the KPI computation plan. Check that the previous step produced valid output.
      </p>
    );
  }

  return (
    <form action={submitAction} className="space-y-5">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <input type="hidden" name="mapping_json" value={JSON.stringify(mapping_to_kpi_keys)} />
      <p className="text-sm text-[var(--muted)]">
        Answer the questions below. Use the placeholder as a hint if you don&apos;t know the exact value.
      </p>
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-[var(--card-border)] bg-slate-50/50 dark:bg-slate-900/20 p-4">
            <label htmlFor={`answer_${i}`} className="block text-sm font-medium text-[var(--foreground)] mb-2">
              {i + 1}. {q}
            </label>
            <textarea
              id={`answer_${i}`}
              name={`answer_${i}`}
              rows={3}
              defaultValue={existingAnswers[i] ?? ""}
              placeholder={placeholders[i] ?? ""}
              className="w-full min-h-[4.5rem] rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-y"
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
      >
        Save answers
      </button>
    </form>
  );
}
