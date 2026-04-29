import { redirect } from "next/navigation";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { IntakeForm } from "@/components/IntakeForm";
import { getIntakeFormState, processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { startPhaseRunsInGlobalSequence } from "@/lib/phaseRunJobs";
import { runCompanyEnrichment } from "@/lib/companyEnrichment";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

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
      errorMessage: "Superseded by a new full restart from intake form.",
      finishedAt: new Date(),
      heartbeatAt: new Date(),
    },
  });
}

async function submitIntake(formData: FormData) {
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
      console.error("[intake/background-enrichment][async]", err);
    });
  }
  if (profileFlow === "auto_web" || profileFlow === "auto_no_web") {
    const locale = await getServerLocale();
    await resetActivePhaseRunJobs(company.id);
    void startBackgroundRunsPerPhase(company.id, locale).catch((err) => {
      console.error("[intake/background-start][async]", err);
    });
  }
  redirect("/profile");
}

export default async function IntakePage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const { existing, formKey: intakeFormKey } = await getIntakeFormState(company.id);
  const settings = await prisma.companySettings.findUnique({
    where: { companyId: company.id },
    select: { llmApiUrl: true, llmApiKey: true },
  });
  const hasLlmConfigured = Boolean(settings?.llmApiUrl?.trim()) || Boolean(settings?.llmApiKey?.trim());

  return (
    <div className="space-y-8">
      <Section
        title={t.intake.title}
        description={t.intake.description}
      >
        <IntakeForm key={intakeFormKey} existing={existing} submitAction={submitIntake} hasLlmConfigured={hasLlmConfigured} />
      </Section>
    </div>
  );
}
