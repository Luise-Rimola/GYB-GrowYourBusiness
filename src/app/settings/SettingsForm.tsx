"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";

type SettingsFormProps = {
  companyId: string;
  initialValues: {
    llmApiUrl: string;
    llmApiKey: string;
    llmModel: string;
  };
  hasStoredKey?: boolean;
  /** Studienablauf: Schritt nach FB1 als erledigt markieren */
  markLlmSetupComplete?: boolean;
  /** Nach erfolgreichem Speichern navigieren */
  redirectTo?: string;
};

export function SettingsForm({
  companyId,
  initialValues,
  markLlmSetupComplete,
  redirectTo,
}: SettingsFormProps) {
  const router = useRouter();
  const { locale } = useLanguage();
  const t = getTranslations(locale).settingsForm;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [values, setValues] = useState(initialValues);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          llmApiUrl: values.llmApiUrl.trim() || null,
          llmApiKey: values.llmApiKey && values.llmApiKey !== "••••••••" ? values.llmApiKey.trim() : undefined,
          llmModel: values.llmModel.trim() || null,
          ...(markLlmSetupComplete ? { markLlmSetupComplete: true } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? t.saveFailed);
      }
      setMessage({ type: "success", text: t.saved });
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          {t.apiUrl}
        </label>
        <input
          type="url"
          value={values.llmApiUrl}
          onChange={(e) => setValues((v) => ({ ...v, llmApiUrl: e.target.value }))}
          placeholder={t.placeholderUrl}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          {t.apiKey}
        </label>
        <input
          type="password"
          value={values.llmApiKey}
          onChange={(e) => setValues((v) => ({ ...v, llmApiKey: e.target.value }))}
          placeholder={t.placeholderKey}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t.apiKeyHint}
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
          {t.model}
        </label>
        <input
          type="text"
          value={values.llmModel}
          onChange={(e) => setValues((v) => ({ ...v, llmModel: e.target.value }))}
          placeholder="gpt-4o-mini"
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
        />
      </div>
      {message && (
        <p
          className={`text-sm ${message.type === "success" ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"}`}
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? t.saving : t.save}
      </button>
    </form>
  );
}
