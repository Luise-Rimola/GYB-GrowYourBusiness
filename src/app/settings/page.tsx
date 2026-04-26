import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { getSessionFromCookies } from "@/lib/session";
import {
  getEnvDefaultApiKey,
  getEnvDefaultApiUrl,
  getEnvDefaultModel,
  sanitizeHttpUrl,
} from "@/lib/llmEnvDefaults";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const sp = await searchParams;
  const isEmbed = sp.embed === "1";
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const session = await getSessionFromCookies();
  const company = await getOrCreateDemoCompany();
  let settings = await prisma.companySettings.findUnique({
    where: { companyId: company.id },
  });
  if (settings?.llmApiUrl && !sanitizeHttpUrl(settings.llmApiUrl)) {
    settings = await prisma.companySettings.update({
      where: { companyId: company.id },
      data: { llmApiUrl: null },
    });
  }
  const envModel = getEnvDefaultModel();
  const latestProfile = await prisma.companyProfile.findFirst({
    where: { companyId: company.id },
    orderBy: { version: "desc" },
  });

  return (
    <div className="space-y-8">
      {!isEmbed ? (
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {t.settings.title}
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            {t.settings.description}
          </p>
        </header>
      ) : null}

      <Section
        title={t.settings.llmApi}
        description={t.settings.llmApiDesc}
      >
        <SettingsForm
          companyId={company.id}
          initialValues={{
            llmApiUrl: sanitizeHttpUrl(settings?.llmApiUrl) || getEnvDefaultApiUrl(),
            llmApiKey: settings?.llmApiKey ? "••••••••" : getEnvDefaultApiKey(),
            llmModel: settings?.llmModel?.trim() || envModel,
          }}
          hasStoredKey={!!settings?.llmApiKey}
        />
      </Section>

      {!isEmbed && session && (
        <Section title={t.settings.accountSection} description={t.settings.accountLogoutHint}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--foreground)]">
              <span className="text-[var(--muted)]">{t.settings.accountSignedInAs}: </span>
              <span className="font-medium">{session.email}</span>
            </p>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-teal-50 dark:hover:bg-teal-950/30"
              >
                {t.auth.logout}
              </button>
            </form>
          </div>
        </Section>
      )}

      {!isEmbed ? (
        <Section
          title={t.profile.title}
          description={t.profile.description}
          actions={
            <Link
              href="/profile"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {t.common.edit}
            </Link>
          }
        >
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <p className="text-sm text-[var(--muted)]">
              {t.profile.latestProfile.replace("{version}", String(latestProfile?.version ?? 0))}
            </p>
            <Link
              href="/profile"
              className="mt-2 inline-block text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
            >
              Profil bearbeiten →
            </Link>
          </div>
        </Section>
      ) : null}
    </div>
  );
}
