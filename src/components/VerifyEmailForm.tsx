"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";

export function VerifyEmailForm() {
  const { locale } = useLanguage();
  const t = getTranslations(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email")?.trim().toLowerCase() ?? "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.replace(/\s/g, "") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t.auth.verifyInvalidCode);
      }
      router.push(typeof data.redirect === "string" ? data.redirect : "/study");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendLoading(true);
    setResendMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t.auth.errorGeneric);
      }
      setResendMessage(t.auth.verifyResendSent);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorGeneric);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.auth.email}</label>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">{t.auth.verifyCodeLabel}</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2.5 text-sm tracking-widest"
            placeholder="000000"
          />
        </div>
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "…" : t.auth.verifySubmit}
        </button>
      </form>

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/50 p-4">
        <p className="text-sm font-medium text-[var(--foreground)]">{t.auth.verifyResendSection}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{t.auth.verifyResendHint}</p>
        <form onSubmit={handleResend} className="mt-3 space-y-2">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-2.5 text-sm"
            placeholder={t.auth.password}
          />
          <button
            type="submit"
            disabled={resendLoading || !password}
            className="w-full rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium transition hover:bg-teal-50 dark:hover:bg-teal-950/30 disabled:opacity-50"
          >
            {resendLoading ? "…" : t.auth.verifyResendButton}
          </button>
        </form>
        {resendMessage && <p className="mt-2 text-sm text-teal-700 dark:text-teal-300">{resendMessage}</p>}
      </div>

      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="text-teal-700 hover:underline">
          {t.auth.verifyBackToLogin}
        </Link>
      </p>
    </div>
  );
}
