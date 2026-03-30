import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { IntakeForm } from "@/components/IntakeForm";
import { processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { ProfileSavedNotifier } from "@/components/ProfileSavedNotifier";

async function saveProfile(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await processIntakeForm(company.id, formData);
  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed) {
    redirect("/profile?embed=1&profileSaved=1");
  }
  redirect("/home#home-next-steps");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; profileSaved?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const profiles = await prisma.companyProfile.findMany({
    where: { companyId: company.id },
    orderBy: { version: "desc" },
  });
  const latest = profiles[0];
  const existing = (latest?.profileJson ?? {}) as Record<string, unknown>;
  const isEmbed = sp.embed === "1";
  const showSavedBanner = isEmbed && sp.profileSaved === "1";

  return (
    <div className="space-y-8">
      <Section title={t.profile.title} description={t.profile.description}>
        <div className="space-y-6">
          {showSavedBanner ? <ProfileSavedNotifier /> : null}
          <IntakeForm
            existing={existing}
            submitAction={saveProfile}
            assistantEmbed={isEmbed}
          />
        </div>
      </Section>

      <Section title={t.profile.profileVersions} description={t.profile.profileVersionsDesc}>
        <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
          {profiles.map((profile) => (
            <div key={profile.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span>
                  {t.profile.version} {profile.version}
                </span>
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
