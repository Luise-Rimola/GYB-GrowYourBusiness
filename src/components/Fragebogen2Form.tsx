"use client";

import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import {
  CF_ITEMS,
  CL_ITEMS,
  DQ_ITEMS,
  EV_ITEMS,
  TR_ITEMS,
  scaleLabelFromStudy,
} from "@/lib/fragebogenScales";

const requiredAsterisk = <span className="ml-1 text-rose-600">*</span>;

type Fragebogen2FormProps = {
  action: (formData: FormData) => Promise<void>;
  t: Record<string, string>;
  category?: string | null;
  /** Gespeicherte Antworten (Server), damit Felder beim erneuten Öffnen vorausgefüllt sind. */
  initialValues?: Partial<Record<string, number | string>>;
  submitLabel?: string;
  hideSubmitButton?: boolean;
  assistantEmbed?: boolean;
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

export function Fragebogen2Form({
  action,
  t,
  category,
  initialValues,
  submitLabel,
  hideSubmitButton,
  assistantEmbed,
}: Fragebogen2FormProps) {
  const shouldHideSubmitButton = Boolean(hideSubmitButton);

  return (
    <form action={action} data-assistant-form="1" className="space-y-8">
      {assistantEmbed ? <input type="hidden" name="assistant_embed" value="1" /> : null}
      {category && <input type="hidden" name="category" value={category} />}
      <div className="space-y-6">
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb2DQ}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {DQ_ITEMS.map(({ key }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}{requiredAsterisk}</label>
                <LikertSelect name={key} fieldKey={key} initialValues={initialValues} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb2EV}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {EV_ITEMS.map(({ key }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}{requiredAsterisk}</label>
                <LikertSelect name={key} fieldKey={key} initialValues={initialValues} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb2TR}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {TR_ITEMS.map(({ key }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}{requiredAsterisk}</label>
                <LikertSelect name={key} fieldKey={key} initialValues={initialValues} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb2CF}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {CF_ITEMS.map(({ key }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}{requiredAsterisk}</label>
                <LikertSelect name={key} fieldKey={key} initialValues={initialValues} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb2CL}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {CL_ITEMS.map(({ key }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}{requiredAsterisk}</label>
                <LikertSelect name={key} fieldKey={key} initialValues={initialValues} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-[var(--card-border)] p-6">
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb2OpenSection}</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb2OpenWithoutTool1}</label>
              <textarea
                name="O1"
                rows={2}
                defaultValue={initialValues?.O1 != null ? String(initialValues.O1) : ""}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb2OpenWithoutTool2}</label>
              <textarea
                name="O2"
                rows={2}
                defaultValue={initialValues?.O2 != null ? String(initialValues.O2) : ""}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb2OpenWithoutTool3}</label>
              <textarea
                name="O3"
                rows={2}
                defaultValue={initialValues?.O3 != null ? String(initialValues.O3) : ""}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>
      </div>
      {!shouldHideSubmitButton && (
        <div className="flex justify-end">
          <PendingSubmitButton>
            {submitLabel ?? t.fb2Submit ?? t.fb1Submit ?? "Absenden"}
          </PendingSubmitButton>
        </div>
      )}
    </form>
  );
}
