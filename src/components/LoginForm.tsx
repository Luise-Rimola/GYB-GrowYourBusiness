"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";

export function LoginForm() {
  const { locale } = useLanguage();
  const t = getTranslations(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.code === "EMAIL_NOT_VERIFIED" && typeof data.email === "string") {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        router.refresh();
        return;
      }
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t.auth.errorGeneric);
      }
      router.push(typeof data.redirect === "string" ? data.redirect : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm"
        />
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
      >
        {loading ? "…" : t.auth.submitLogin}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/register" className="text-teal-700 hover:underline">
          {t.auth.noAccount}
        </Link>
      </p>
    </form>
  );
}
