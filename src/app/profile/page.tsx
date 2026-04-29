import { redirect } from "next/navigation";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { IntakeForm } from "@/components/IntakeForm";
import { getIntakeFormState, processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { ProfileSavedNotifier } from "@/components/ProfileSavedNotifier";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { startPhaseRunsInGlobalSequence } from "@/lib/phaseRunJobs";
import { runCompanyEnrichment } from "@/lib/companyEnrichment";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

/**
 * Startet persistente Background-Jobs global sequentiell über alle Phasen:
 * Phase 1 komplett -> Phase 2 komplett -> ...
 * So bleiben Kontextabhängigkeiten stabil und der Fortschritt nachvollziehbar.
 */
async function startBackgroundRunsPerPhase(companyId: string, locale: Locale): Promise<void> {
  const phaseEntries = PLANNING_PHASES.map((phase) => ({
    phaseId: phase.id,
    workflowKeys: phase.workflowKeys.filter((k) => k !== "WF_BUSINESS_FORM"),
  }));
  await startPhaseRunsInGlobalSequence({
    companyId,
    phaseEntries,
    mode: "run_all",
    locale,
  });
}

async function resetActivePhaseRunJobs(companyId: string): Promise<void> {
  const phaseRunJob = (prisma as unknown as { phaseRunJob?: any }).phaseRunJob;
  if (!phaseRunJob) return;

  const activeJobs = (await phaseRunJob.findMany({
    where: { companyId, status: { in: ["queued", "running"] } },
    select: { id: true, stepsJson: true },
  })) as Array<{ id: string; stepsJson: unknown }>;

  const runIds = new Set<string>();
  for (const job of activeJobs) {
    if (!Array.isArray(job.stepsJson)) continue;
    for (const entry of job.stepsJson as Array<{ runId?: unknown }>) {
      if (typeof entry?.runId === "string" && entry.runId.length > 0) {
        runIds.add(entry.runId);
      }
    }
  }

  if (runIds.size > 0) {
    await prisma.run.updateMany({
      where: { id: { in: [...runIds] }, status: "running" },
      data: { status: "incomplete", finishedAt: new Date() },
    });
  }

  await phaseRunJob.updateMany({
    where: { companyId, status: { in: ["queued", "running"] } },
    data: {
      status: "failed",
      cancelRequested: true,
      errorMessage: "Superseded by a new full restart from profile form.",
      finishedAt: new Date(),
      heartbeatAt: new Date(),
    },
  });
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
    await resetActivePhaseRunJobs(company.id);
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
