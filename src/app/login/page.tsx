import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

export default async function LoginPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.auth.loginTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t.auth.loginSubtitle}</p>
      </header>
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">…</p>}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/" className="text-teal-700 hover:underline">
          ← {t.nav.home}
        </Link>
      </p>
    </div>
  );
}
