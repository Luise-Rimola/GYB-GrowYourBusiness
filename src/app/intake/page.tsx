import { redirect } from "next/navigation";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { IntakeForm } from "@/components/IntakeForm";
import { getIntakeFormState, processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { startPhaseRunJob } from "@/lib/phaseRunJobs";
import { runCompanyEnrichment } from "@/lib/companyEnrichment";
import type { Locale } from "@/lib/i18n";

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
      console.error("[intake/background-start]", phase.id, err);
    }
  }
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

  return (
    <div className="space-y-8">
      <Section
        title={t.intake.title}
        description={t.intake.description}
      >
        <IntakeForm key={intakeFormKey} existing={existing} submitAction={submitIntake} />
      </Section>
    </div>
  );
}
