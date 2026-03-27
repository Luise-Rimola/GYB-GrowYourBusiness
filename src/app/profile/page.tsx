import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { ReadableDataView } from "@/components/ReadableDataView";
import { AdvancedJson } from "@/components/AdvancedJson";
import { IntakeForm } from "@/components/IntakeForm";
import { processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

async function saveProfile(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await processIntakeForm(company.id, formData);
  redirect("/home");
}

export default async function ProfilePage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const profiles = await prisma.companyProfile.findMany({
    where: { companyId: company.id },
    orderBy: { version: "desc" },
  });
  const latest = profiles[0];
  const existing = (latest?.profileJson ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-8">
      <Section title={t.profile.title} description={t.profile.description}>
        <div className="space-y-8">
          {/* Aktuelles Profil sichtbar */}
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t.profile.latestProfile.replace("{version}", String(latest?.version ?? 0))}
            </p>
            <div className="mt-3 space-y-3">
              <ReadableDataView data={latest?.profileJson ?? {}} summary={t.data.viewData} />
              <AdvancedJson data={latest?.profileJson ?? {}} title={t.common.advanced} summary={t.data.rawJson} />
            </div>
          </div>

          {/* Formular zum Bearbeiten */}
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {t.profile.editProfile}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t.profile.editProfileDesc}
            </p>
            <div className="mt-4">
              <IntakeForm existing={existing} submitAction={saveProfile} />
            </div>
          </div>
        </div>
      </Section>

      <Section title={t.profile.profileVersions} description={t.profile.profileVersionsDesc}>
        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          {profiles.map((profile) => (
            <div key={profile.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span>{t.profile.version} {profile.version}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {profile.createdAt.toDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
