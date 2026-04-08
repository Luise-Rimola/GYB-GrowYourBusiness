"use client";

import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import {
  COMP_ITEMS,
  FIT_ITEMS,
  GOV_ITEMS,
  TAM_UTAUT_ITEMS,
  US_ITEMS,
  scaleLabelFromStudy,
} from "@/lib/fragebogenScales";

type Fragebogen4FormProps = {
  action: (formData: FormData) => Promise<void>;
  t: Record<string, string>;
  initialValues?: Partial<Record<string, number | string>>;
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

export function Fragebogen4Form({
  action,
  t,
  initialValues,
  hideSubmitButton,
  assistantEmbed,
}: Fragebogen4FormProps) {
  const shouldHideSubmitButton = Boolean(hideSubmitButton);
  const iv = initialValues;

  return (
    <form action={action} data-assistant-form="1" className="space-y-8">
      {assistantEmbed ? <input type="hidden" name="assistant_embed" value="1" /> : null}
      <section className="rounded-xl border border-[var(--card-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb4SectionUsability}</h3>
        <p className="mb-4 text-xs text-[var(--muted)]">{t.fb4CompareIntro}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {US_ITEMS.map(({ key }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}</label>
              <LikertSelect name={key} fieldKey={key} initialValues={iv} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-[var(--card-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb4SectionTam}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {TAM_UTAUT_ITEMS.map(({ key }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}</label>
              <LikertSelect name={key} fieldKey={key} initialValues={iv} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-[var(--card-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb4SectionOpenCompare}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4OpenCompare1}</label>
            <textarea
              name="O1"
              rows={2}
              defaultValue={iv?.O1 != null ? String(iv.O1) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4OpenCompare2}</label>
            <textarea
              name="O2"
              rows={2}
              defaultValue={iv?.O2 != null ? String(iv.O2) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4OpenCompare3}</label>
            <textarea
              name="O3"
              rows={2}
              defaultValue={iv?.O3 != null ? String(iv.O3) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-[var(--card-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb3COMP}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {COMP_ITEMS.map(({ key }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}</label>
              <LikertSelect name={key} fieldKey={key} initialValues={iv} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-[var(--card-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb3FIT}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIT_ITEMS.map(({ key }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}</label>
              <LikertSelect name={key} fieldKey={key} initialValues={iv} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-[var(--card-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb3GOV}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {GOV_ITEMS.map(({ key }) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-[var(--muted)]">{scaleLabelFromStudy(t, key)}</label>
              <LikertSelect name={key} fieldKey={key} initialValues={iv} />
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-[var(--card-border)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">{t.fb4SectionInterview}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4Interview1}</label>
            <textarea
              name="I1"
              rows={3}
              defaultValue={iv?.I1 != null ? String(iv.I1) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4Interview2}</label>
            <textarea
              name="I2"
              rows={3}
              defaultValue={iv?.I2 != null ? String(iv.I2) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4Interview3}</label>
            <textarea
              name="I3"
              rows={3}
              defaultValue={iv?.I3 != null ? String(iv.I3) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4Interview4}</label>
            <textarea
              name="I4"
              rows={3}
              defaultValue={iv?.I4 != null ? String(iv.I4) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">{t.fb4Interview5}</label>
            <textarea
              name="I5"
              rows={3}
              defaultValue={iv?.I5 != null ? String(iv.I5) : ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>
      {!shouldHideSubmitButton && (
        <div className="flex justify-end">
          <PendingSubmitButton>{t.fb4Submit ?? "Absenden"}</PendingSubmitButton>
        </div>
      )}
    </form>
  );
}
