import { prisma } from "@/lib/prisma";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenarios";

export type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
};

/** Pro Studienbereich: Ziel-Phase im Dashboard für den Workflow-Link. */
export const STUDY_CATEGORY_PHASE_ID: Record<ScenarioCategory, string> = {
  markt_geschaeftsmodell: "ideation",
  produktstrategie: "validation",
  marketing: "launch",
  wachstum_expansion: "scaling",
  investition_strategie: "launch",
};

export function workflowDashboardHrefForCategory(category: ScenarioCategory): string {
  const phaseId = STUDY_CATEGORY_PHASE_ID[category];
  return `/dashboard?assistant_phase=${phaseId}#phase-${phaseId}`;
}

export async function loadAssistantSteps(params: {
  companyId: string;
  participantId: string;
  participantCompletedFb1: boolean;
  participantCompletedFb5?: boolean;
  profileCompletePercent: number;
  t: {
    common: { viewArtifacts: string };
    home: { companyProfile: string; stepLlm: string; step2: string; step5: string; step6: string };
    study: {
      fb1Title: string;
      studyInfoStep: string;
      fb2Title: string;
      studyWorkflowStep: string;
      fb3Title: string;
      fb4Title: string;
      fb5Title: string;
    };
  };
}): Promise<AssistantStep[]> {
  const {
    companyId,
    participantId,
    participantCompletedFb1,
    participantCompletedFb5,
    profileCompletePercent,
    t,
  } = params;

  const [
    runs,
    decisions,
    artifactsCount,
    sourcesCount,
    documentsCount,
    companySettings,
    scenarioEvaluationCount,
    fb2ByCategory,
    fb3ByCategory,
    fb4ByCategory,
    hasFb5Response,
  ] = await Promise.all([
    prisma.run.findMany({ where: { companyId }, select: { status: true } }),
    prisma.decision.count({ where: { companyId, status: { in: ["proposed", "approved"] } } }),
    prisma.artifact.count({ where: { companyId } }),
    prisma.source.count({ where: { companyId } }),
    prisma.document.count({ where: { companyId } }),
    prisma.companySettings.findUnique({
      where: { companyId },
      select: { llmApiUrl: true, llmApiKey: true },
    }),
    prisma.scenarioEvaluation.count({ where: { companyId } }),
    loadQuestionnaireCategories(participantId, "fb2"),
    loadQuestionnaireCategories(participantId, "fb3"),
    loadQuestionnaireCategories(participantId, "fb4"),
    hasQuestionnaireResponse(participantId, "fb5"),
  ]);

  const completedRuns = runs.filter((r) => ["complete", "approved"].includes(r.status)).length;
  const hasDocsUploaded = sourcesCount > 0 || documentsCount > 0;
  const hasLlmConfigured = Boolean(companySettings?.llmApiUrl?.trim()) || Boolean(companySettings?.llmApiKey?.trim());
  const hasArtifacts = artifactsCount > 0;
  const hasCompletedRuns = completedRuns > 0;
  const hasDecisions = decisions > 0;
  const hasEvaluation = scenarioEvaluationCount > 0;

  const studyCategories: ScenarioCategory[] = [
    "markt_geschaeftsmodell",
    "produktstrategie",
    "marketing",
    "wachstum_expansion",
    "investition_strategie",
  ];
  const fb2DoneByCategory = new Set(fb2ByCategory.map((r) => String(r.category)).filter(Boolean));
  const fb3DoneByCategory = new Set(fb3ByCategory.map((r) => String(r.category)).filter(Boolean));
  const fb4DoneByCategory = new Set(fb4ByCategory.map((r) => String(r.category)).filter(Boolean));
  const fb5Done = Boolean(participantCompletedFb5) || hasFb5Response;

  const studyFlowSteps: AssistantStep[] = studyCategories.flatMap((category) => {
    const categoryLabel = SCENARIO_CATEGORIES[category];
    return [
      {
        href: `/study/info/${category}`,
        label: `${t.study.studyInfoStep}: ${categoryLabel}`,
        completed: false,
      },
      {
        href: `/study/fb2/${category}`,
        label: t.study.fb2Title,
        completed: fb2DoneByCategory.has(category),
      },
      {
        href: workflowDashboardHrefForCategory(category),
        label: t.study.studyWorkflowStep,
        completed: hasCompletedRuns,
      },
      {
        href: `/artifacts#artifacts-phase-${STUDY_CATEGORY_PHASE_ID[category]}`,
        label: t.common.viewArtifacts,
        completed: hasArtifacts,
      },
      {
        href: `/study/fb3/${category}`,
        label: t.study.fb3Title,
        completed: fb3DoneByCategory.has(category),
      },
      {
        href: `/study/fb4/${category}`,
        label: t.study.fb4Title,
        completed: fb4DoneByCategory.has(category),
      },
    ];
  });

  return [
    { href: "/study/fb1", label: t.study.fb1Title, completed: participantCompletedFb1 },
    { href: "/profile", label: t.home.companyProfile, completed: profileCompletePercent >= 50 },
    { href: "/settings#llm-api", label: t.home.stepLlm, completed: hasLlmConfigured },
    { href: "/knowledge", label: t.home.step2, completed: hasDocsUploaded },
    ...studyFlowSteps,
    { href: "/decisions", label: t.home.step5, completed: hasDecisions },
    { href: "/evaluation", label: t.home.step6, completed: hasEvaluation },
    { href: "/study/fb5", label: t.study.fb5Title, completed: fb5Done },
  ];
}

async function loadQuestionnaireCategories(participantId: string, questionnaireType: "fb2" | "fb3" | "fb4") {
  const delegate = (prisma as any).questionnaireResponse;
  if (delegate?.findMany) {
    return delegate.findMany({
      where: { participantId, questionnaireType, category: { not: null } },
      select: { category: true },
    }) as Promise<Array<{ category: string | null }>>;
  }

  const rows = await prisma.$queryRaw<Array<{ category: string | null }>>`
    SELECT category
    FROM QuestionnaireResponse
    WHERE participantId = ${participantId}
      AND questionnaireType = ${questionnaireType}
      AND category IS NOT NULL
  `;
  return rows;
}

async function hasQuestionnaireResponse(participantId: string, questionnaireType: "fb5"): Promise<boolean> {
  const delegate = (prisma as any).questionnaireResponse;
  if (delegate?.findFirst) {
    const row = await delegate.findFirst({
      where: { participantId, questionnaireType, category: null },
      select: { id: true },
    });
    return Boolean(row);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM QuestionnaireResponse
    WHERE participantId = ${participantId}
      AND questionnaireType = ${questionnaireType}
      AND category IS NULL
    LIMIT 1
  `;
  return rows.length > 0;
}
