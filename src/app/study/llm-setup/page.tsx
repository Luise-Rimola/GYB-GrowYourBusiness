import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/companyContext";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import {
  getEnvDefaultApiKey,
  getEnvDefaultApiUrl,
  getEnvDefaultModel,
  sanitizeHttpUrl,
} from "@/lib/llmEnvDefaults";
import { SettingsForm } from "@/app/settings/SettingsForm";

export default async function LlmSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const company = await requireCompany();
  const sp = await searchParams;
  let settings = await prisma.companySettings.findUnique({ where: { companyId: company.id } });
  if (settings?.llmApiUrl && !sanitizeHttpUrl(settings.llmApiUrl)) {
    settings = await prisma.companySettings.update({
      where: { companyId: company.id },
      data: { llmApiUrl: null },
    });
  }
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{t.study.studyLlmPageTitle}</h1>
        <p className="mt-2 text-[var(--muted)]">{t.study.studyLlmPageDesc}</p>
      </header>

      {sp.after === "fb1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb1Saved}
        </div>
      )}

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <SettingsForm
          companyId={company.id}
          initialValues={{
            llmApiUrl: sanitizeHttpUrl(settings?.llmApiUrl) || getEnvDefaultApiUrl(),
            llmApiKey: settings?.llmApiKey ? "••••••••" : getEnvDefaultApiKey(),
            llmModel: settings?.llmModel?.trim() || getEnvDefaultModel(),
          }}
          markLlmSetupComplete
          redirectTo="/study?saved=llm"
        />
        <p className="mt-6 text-sm text-[var(--muted)]">
          <Link href="/study" className="font-medium text-teal-700 hover:underline">
            ← {t.study.studyStart}
          </Link>
        </p>
      </div>
    </div>
  );
}
