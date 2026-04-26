import { redirect } from "next/navigation";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { IntakeForm } from "@/components/IntakeForm";
import { getIntakeFormState, processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { ProfileSavedNotifier } from "@/components/ProfileSavedNotifier";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { startPhaseRunJob } from "@/lib/phaseRunJobs";
import { runCompanyEnrichment } from "@/lib/companyEnrichment";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

/**
 * Startet einen persistenten Background-Job pro Planungsphase. So sieht der
 * User auf dem Dashboard pro Phase-Karte den eigenen Fortschritt, und alle
 * Phasen laufen parallel (innerhalb jeder Phase werden Workflows zusätzlich
 * parallelisiert — siehe `phaseRunJobs.ts`).
 */
async function startBackgroundRunsPerPhase(companyId: string, locale: Locale): Promise<void> {
  for (const phase of PLANNING_PHASES) {
    const workflowKeys = phase.workflowKeys.filter((k) => k !== "WF_BUSINESS_FORM");
    if (workflowKeys.length === 0) continue;
    try {
      await startPhaseRunJob({
        companyId,
        phaseId: phase.id,
        workflowKeys,
        mode: "continue",
        locale,
      });
    } catch (err) {
      console.error("[profile/background-start]", phase.id, err);
    }
  }
}

async function saveProfile(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await processIntakeForm(company.id, formData);
  const profileFlow = String(formData.get("profile_flow") ?? "manual").trim();
  if (profileFlow === "auto_web") {
    const locale = await getServerLocale();
    const companyName = String(formData.get("company_name") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim();
    void runCompanyEnrichment({
      companyId: company.id,
      companyName,
      website,
      location,
      locale,
    }).catch((err) => {
      console.error("[profile/background-enrichment][async]", err);
    });
  }
  if (profileFlow === "auto_web" || profileFlow === "auto_no_web") {
    const locale = await getServerLocale();
    void startBackgroundRunsPerPhase(company.id, locale).catch((err) => {
      console.error("[profile/background-start][async]", err);
    });
  }
  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed) {
    redirect("/dashboard?assistant_phase=ideation&embed=1&profileSaved=1&assistantContinue=fb2");
  }
  redirect("/dashboard?view=execution");
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
  const { existing, formKey: intakeFormKey } = await getIntakeFormState(company.id);
  const settings = await prisma.companySettings.findUnique({
    where: { companyId: company.id },
    select: { llmApiUrl: true, llmApiKey: true },
  });
  const hasLlmConfigured = Boolean(settings?.llmApiUrl?.trim()) || Boolean(settings?.llmApiKey?.trim());
  const isEmbed = sp.embed === "1";
  const showSavedBanner = isEmbed && sp.profileSaved === "1";

  if (isEmbed) {
    return (
      <div className="h-full">
        <div className="h-full space-y-4">
          {showSavedBanner ? <ProfileSavedNotifier /> : null}
          <IntakeForm
            key={intakeFormKey}
            existing={existing}
            submitAction={saveProfile}
            assistantEmbed={isEmbed}
            embedFlush
            hasLlmConfigured={hasLlmConfigured}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Section title={t.profile.title} description={t.profile.description}>
        <div className="space-y-6">
          {showSavedBanner ? <ProfileSavedNotifier /> : null}
          <IntakeForm
            key={intakeFormKey}
            existing={existing}
            submitAction={saveProfile}
            assistantEmbed={isEmbed}
            hasLlmConfigured={hasLlmConfigured}
          />
        </div>
      </Section>
    </div>
  );
}
