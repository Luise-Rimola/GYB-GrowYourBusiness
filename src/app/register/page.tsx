import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

export default async function RegisterPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.auth.registerTitle}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t.auth.registerSubtitle}</p>
      </header>
      <RegisterForm />
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/" className="text-teal-700 hover:underline">
          ← {t.nav.home}
        </Link>
      </p>
    </div>
  );
}
