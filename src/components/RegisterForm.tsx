"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";
import { fetchApi } from "@/lib/apiClient";
import { SUBMIT_BUTTON_PENDING_CLASS } from "@/lib/submitButtonStyle";
import { CollapsibleDetails } from "@/components/CollapsibleDetails";

export function RegisterForm() {
  const { locale } = useLanguage();
  const t = getTranslations(locale);
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!privacyAccepted) {
      setError(t.auth.registerPrivacyRequired);
      setLoading(false);
      return;
    }
    try {
      const res = await fetchApi("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
          locale,
          privacyAccepted: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t.auth.errorGeneric);
      }
      if (data.needsVerification === true && typeof data.email === "string") {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        router.refresh();
        return;
      }
      router.push(typeof data.redirect === "string" ? data.redirect : "/home");
      router.refresh();
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.auth.nameOptional}</label>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.auth.email}</label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.auth.password}</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">{t.auth.passwordMinHint}</p>
      </div>
      <CollapsibleDetails
        defaultOpen={false}
        className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
        summaryClassName="cursor-pointer select-none text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
        contentClassName="mt-3 max-h-[min(22rem,55vh)] overflow-y-auto border-t border-[var(--card-border)] pt-3 text-xs leading-relaxed text-[var(--muted)]"
        label={t.auth.registerPrivacyToggle}
      >
        {t.auth.registerPrivacyBody.split("\n\n").map((para, i) => (
          <p key={i} className={i > 0 ? "mt-3" : ""}>
            {para}
          </p>
        ))}
      </CollapsibleDetails>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--foreground)]">
        <input
          type="checkbox"
          name="privacyAccepted"
          required
          aria-required="true"
          checked={privacyAccepted}
          onChange={(e) => setPrivacyAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--card-border)] text-teal-600 focus:ring-teal-500"
        />
        <span>
          {t.auth.registerPrivacyCheckbox}
          <span className="ml-1 text-rose-600" aria-hidden>
            *
          </span>
        </span>
      </label>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className={`w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-100 ${loading ? SUBMIT_BUTTON_PENDING_CLASS : ""}`}
      >
        {loading ? "…" : t.auth.submitRegister}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="text-teal-700 hover:underline">
          {t.auth.haveAccount}
        </Link>
      </p>
    </form>
  );
}
