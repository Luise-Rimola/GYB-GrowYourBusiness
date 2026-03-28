import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { prisma } from "@/lib/prisma";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { loadAssistantSteps } from "@/lib/assistantSteps";
import { WorkflowAssistantFrame } from "@/components/WorkflowAssistantFrame";

export default async function AssistantPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const latestProfile = await prisma.companyProfile.findFirst({
    where: { companyId: company.id },
    orderBy: { version: "desc" },
  });
  const profileComplete = latestProfile ? Math.round(latestProfile.completenessScore * 100) : 0;

  const steps = await loadAssistantSteps({
    companyId: company.id,
    participantId: participant.id,
    participantCompletedFb1: participant.completedFb1,
    participantCompletedFb5: Boolean((participant as { completedFb5?: boolean }).completedFb5),
    profileCompletePercent: profileComplete,
    t: {
      common: { viewArtifacts: t.common.viewArtifacts },
      home: { companyProfile: t.home.companyProfile, stepLlm: t.home.stepLlm, step2: t.home.step2, step5: t.home.step5, step6: t.home.step6 },
      study: {
        studyFb1Btn: t.study.studyFb1Btn,
        studyInfoStep: t.study.studyInfoStep,
        studyFb2BeforeCategory: t.study.studyFb2BeforeCategory,
        studyWorkflowStep: t.study.studyWorkflowStep,
        studyFb3AfterCategory: t.study.studyFb3AfterCategory,
        studyFb4Btn: t.study.studyFb4Btn,
        studyFb5Btn: t.study.studyFb5Btn,
      },
    },
  });

  return (
    <div className="-my-10 max-md:-mx-6 max-md:w-[calc(100%+3rem)] max-md:max-w-[100vw] overflow-hidden py-2 md:mx-0 md:w-full md:py-4">
      <WorkflowAssistantFrame steps={steps} />
    </div>
  );
}
