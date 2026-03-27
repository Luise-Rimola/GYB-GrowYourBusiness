"use client";

type Fragebogen5FormProps = {
  action: (formData: FormData) => Promise<void>;
  t: Record<string, string>;
  initialValues?: Partial<Record<string, number | string>>;
  submitLabel?: string;
  hideSubmitButton?: boolean;
};

function likertDefault(initial: Partial<Record<string, number | string>> | undefined, key: string): number {
  const v = initial?.[key];
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 7 ? n : 4;
}

function LikertSelect({
  name,
  initialValues,
  fieldKey,
}: {
  name: string;
  initialValues?: Partial<Record<string, number | string>>;
  fieldKey: string;
}) {
  const defaultValue = likertDefault(initialValues, fieldKey);
  return (
    <select
      name={name}
      required
      defaultValue={defaultValue}
      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
    >
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

const LIKERT_KEYS = ["X1", "X2", "X3", "X4", "X5"] as const;

export function Fragebogen5Form({
  action,
  t,
  initialValues,
  submitLabel,
  hideSubmitButton,
}: Fragebogen5FormProps) {
  const shouldHideSubmitButton = Boolean(hideSubmitButton);
  const labels: Record<(typeof LIKERT_KEYS)[number], string> = {
    X1: t.fb5X1,
    X2: t.fb5X2,
    X3: t.fb5X3,
    X4: t.fb5X4,
    X5: t.fb5X5,
  };

  return (
    <form action={action} data-assistant-form="1" className="space-y-8">
      <div className="space-y-6">
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{t.fb5LikertSection}</h3>
          <p className="mb-4 text-xs text-[var(--muted)]">{t.fb5LikertIntro}</p>
          <div className="grid gap-4 sm:grid-cols-1">
            {LIKERT_KEYS.map((key) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-[var(--muted)]">{labels[key]}</label>
                <LikertSelect name={key} fieldKey={key} initialValues={initialValues} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{t.fb5OpenSection}</h3>
          <p className="mb-4 text-xs text-[var(--muted)]">{t.fb5OpenIntro}</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb5T1}</label>
              <textarea
                name="T1"
                rows={3}
                defaultValue={initialValues?.T1 != null ? String(initialValues.T1) : ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb5T2}</label>
              <textarea
                name="T2"
                rows={3}
                defaultValue={initialValues?.T2 != null ? String(initialValues.T2) : ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb5T3}</label>
              <textarea
                name="T3"
                rows={3}
                defaultValue={initialValues?.T3 != null ? String(initialValues.T3) : ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb5T4}</label>
              <textarea
                name="T4"
                rows={3}
                defaultValue={initialValues?.T4 != null ? String(initialValues.T4) : ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>
      </div>
      {!shouldHideSubmitButton && (
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {submitLabel ?? t.fb5Submit ?? "Absenden"}
          </button>
        </div>
      )}
    </form>
  );
}
