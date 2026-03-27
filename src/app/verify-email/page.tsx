import { Suspense } from "react";
import Link from "next/link";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

export default async function VerifyEmailPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.auth.verifyEmailTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t.auth.verifyEmailSubtitle}</p>
      </header>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">…</p>}>
        <VerifyEmailForm />
      </Suspense>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/" className="text-teal-700 hover:underline">
          ← {t.nav.home}
        </Link>
      </p>
    </div>
  );
}
