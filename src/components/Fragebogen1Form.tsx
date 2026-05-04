"use client";

import { Section } from "@/components/Section";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { getFragebogen1SelectOptions } from "@/lib/fragebogen1Options";
import type { Locale } from "@/lib/i18n";

const requiredAsterisk = <span className="ml-1 text-rose-600">*</span>;

type Fragebogen1FormProps = {
  locale: Locale;
  action: (formData: FormData) => Promise<void>;
  t: {
    fb1CategoryA: string;
    fb1CategoryB: string;
    fb1CategoryC: string;
    fb1A1: string;
    fb1A2: string;
    fb1A3: string;
    fb1A4: string;
    fb1A5: string;
    fb1A6: string;
    fb1B1: string;
    fb1B2: string;
    fb1B3: string;
    fb1C1: string;
    fb1C2: string;
    fb1C3: string;
    fb1C4: string;
    fb1C5: string;
    fb1C6: string;
    fb1CategoryD: string;
    fb1DIntro: string;
    fb1D1: string;
    fb1D2: string;
    fb1D3: string;
    fb1D4: string;
    fb1Scale1: string;
    fb1Scale7: string;
    fb1Submit: string;
  };
  initialData?: {
    a?: Record<string, unknown>;
    b?: Record<string, unknown>;
    c?: Record<string, unknown>;
    d?: Record<string, unknown>;
  };
  submitLabel?: string;
  hideSubmitButton?: boolean;
  assistantEmbed?: boolean;
};

export function Fragebogen1Form({
  locale,
  action,
  t,
  initialData,
  submitLabel,
  hideSubmitButton,
  assistantEmbed,
}: Fragebogen1FormProps) {
  const shouldHideSubmitButton = Boolean(hideSubmitButton);
  const { A1: A1_OPTIONS, A2: A2_OPTIONS, A3: A3_OPTIONS, A6: A6_OPTIONS, B1: B1_OPTIONS } =
    getFragebogen1SelectOptions(locale);

  const a = (initialData?.a ?? {}) as Record<string, string | number>;
  const b = (initialData?.b ?? {}) as Record<string, string | number>;
  const c = (initialData?.c ?? {}) as Record<string, string | number>;
  const d = (initialData?.d ?? {}) as Record<string, string>;

  return (
    <form
      action={action}
      data-assistant-form="1"
      className="space-y-8 [&_input]:border-zinc-300 [&_input]:bg-white [&_select]:border-zinc-300 [&_select]:bg-[var(--background)] [&_textarea]:border-zinc-300 [&_textarea]:bg-white dark:[&_input]:border-[var(--card-border)] dark:[&_input]:bg-[var(--card)] dark:[&_select]:border-[var(--card-border)] dark:[&_select]:bg-[var(--card)] dark:[&_textarea]:border-[var(--card-border)] dark:[&_textarea]:bg-[var(--card)]"
    >
      {assistantEmbed ? <input type="hidden" name="assistant_embed" value="1" /> : null}
      <Section title={t.fb1CategoryA} description="">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1A1}{requiredAsterisk}</label>
            <select
              name="A1"
              required
              defaultValue={a.A1}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            >
              <option value="">—</option>
              {A1_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1A2}{requiredAsterisk}</label>
            <select
              name="A2"
              required
              defaultValue={a.A2}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            >
              <option value="">—</option>
              {A2_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1A3}{requiredAsterisk}</label>
            <select
              name="A3"
              required
              defaultValue={a.A3}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm dark:bg-[var(--card)]"
            >
              <option value="">—</option>
              {A3_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1A4}{requiredAsterisk}</label>
            <input
              type="text"
              name="A4"
              required
              defaultValue={a.A4}
              placeholder="z.B. Gastronomie, SaaS"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm dark:bg-[var(--card)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1A5}{requiredAsterisk}</label>
            <input
              type="number"
              name="A5"
              required
              min={0}
              max={50}
              defaultValue={a.A5}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm dark:bg-[var(--card)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1A6}{requiredAsterisk}</label>
            <select
              name="A6"
              required
              defaultValue={a.A6}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm dark:bg-[var(--card)]"
            >
              <option value="">—</option>
              {A6_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title={t.fb1CategoryB} description="">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1B1}{requiredAsterisk}</label>
            <select
              name="B1"
              required
              defaultValue={b.B1}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm dark:bg-[var(--card)]"
            >
              <option value="">—</option>
              {B1_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1B2}{requiredAsterisk}</label>
            <select
              name="B2"
              required
              defaultValue={b.B2}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? `— ${t.fb1Scale1}` : n === 7 ? `— ${t.fb1Scale7}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1B3}{requiredAsterisk}</label>
            <select
              name="B3"
              required
              defaultValue={b.B3}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? `— ${t.fb1Scale1}` : n === 7 ? `— ${t.fb1Scale7}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title={t.fb1CategoryC} description="">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              { key: "C1", label: t.fb1C1 },
              { key: "C2", label: t.fb1C2 },
              { key: "C3", label: t.fb1C3 },
              { key: "C4", label: t.fb1C4 },
              { key: "C5", label: t.fb1C5 },
              { key: "C6", label: t.fb1C6 },
            ] as const
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                {label}{requiredAsterisk}
              </label>
              <select
                name={key}
                required
                defaultValue={c[key]}
                className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? `— ${t.fb1Scale1}` : n === 7 ? `— ${t.fb1Scale7}` : ""}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.fb1CategoryD} description={t.fb1DIntro}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1D1}</label>
            <textarea
              name="D1"
              rows={3}
              defaultValue={d.D1 ?? ""}
              spellCheck={false}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1D2}</label>
            <textarea
              name="D2"
              rows={3}
              defaultValue={d.D2 ?? ""}
              spellCheck={false}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1D3}</label>
            <textarea
              name="D3"
              rows={3}
              defaultValue={d.D3 ?? ""}
              spellCheck={false}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.fb1D4}</label>
            <textarea
              name="D4"
              rows={3}
              defaultValue={d.D4 ?? ""}
              spellCheck={false}
              className="w-full rounded-xl border border-[var(--card-border)] bg-white px-3 py-2 text-sm dark:bg-[var(--card)]"
            />
          </div>
        </div>
      </Section>

      {!shouldHideSubmitButton && (
        <div className="flex justify-end">
          <PendingSubmitButton>{submitLabel ?? t.fb1Submit}</PendingSubmitButton>
        </div>
      )}
    </form>
  );
}
