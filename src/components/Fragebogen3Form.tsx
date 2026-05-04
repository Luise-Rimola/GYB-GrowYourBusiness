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

type Fragebogen3FormProps = {
  action: (formData: FormData) => Promise<void>;
  t: Record<string, string>;
  category?: string | null;
  initialValues?: Partial<Record<string, number | string>>;
  submitLabel?: string;
  hideSubmitButton?: boolean;
  assistantEmbed?: boolean;
  showIntroText?: boolean;
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
      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm dark:bg-[var(--card)]"
    >
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}

export function Fragebogen3Form({
  action,
  t,
  category,
  initialValues,
  submitLabel,
  hideSubmitButton,
  assistantEmbed,
  showIntroText = true,
}: Fragebogen3FormProps) {
  const shouldHideSubmitButton = Boolean(hideSubmitButton);

  return (
    <form
      action={action}
      data-assistant-form="1"
      className="space-y-8 [&_section]:border-zinc-300 [&_section]:bg-white [&_input]:border-zinc-300 [&_input]:bg-white [&_select]:border-zinc-300 [&_select]:bg-[var(--background)] [&_textarea]:border-zinc-300 [&_textarea]:bg-white dark:[&_section]:border-[var(--card-border)] dark:[&_section]:bg-[var(--card)] dark:[&_input]:border-[var(--card-border)] dark:[&_input]:bg-[var(--card)] dark:[&_select]:border-[var(--card-border)] dark:[&_select]:bg-[var(--card)] dark:[&_textarea]:border-[var(--card-border)] dark:[&_textarea]:bg-[var(--card)]"
    >
      {assistantEmbed ? <input type="hidden" name="assistant_embed" value="1" /> : null}
      {category && <input type="hidden" name="category" value={category} />}
      {showIntroText ? <p className="text-sm text-[var(--muted)]">{t.fb3SameAsFb2Intro}</p> : null}
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
          <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb3OpenSection}</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb3OpenWithTool1}</label>
              <textarea
                name="O1"
                rows={2}
                defaultValue={initialValues?.O1 != null ? String(initialValues.O1) : ""}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb3OpenWithTool2}</label>
              <textarea
                name="O2"
                rows={2}
                defaultValue={initialValues?.O2 != null ? String(initialValues.O2) : ""}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb3OpenWithTool3}</label>
              <textarea
                name="O3"
                rows={2}
                defaultValue={initialValues?.O3 != null ? String(initialValues.O3) : ""}
                spellCheck={false}
                className="w-full rounded-lg border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
              />
            </div>
          </div>
        </section>
        <p className="text-sm text-[var(--muted)]">{t.fb3Fb4Hint}</p>
      </div>
      {!shouldHideSubmitButton && (
        <div className="flex justify-end">
          <PendingSubmitButton>
            {submitLabel ?? t.fb3Submit ?? t.fb1Submit ?? "Absenden"}
          </PendingSubmitButton>
        </div>
      )}
    </form>
  );
}
