import { prisma } from "@/lib/prisma";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { type StudyCategoryKey } from "@/lib/studyCategoryContext";
import type { Locale } from "@/lib/i18n";

export type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
};

/** Pro Studienbereich: Ziel-Phase im Dashboard für den Workflow-Link. */
export const STUDY_CATEGORY_PHASE_ID: Record<StudyCategoryKey, string> = {
  markt_geschaeftsmodell: "ideation",
  produktstrategie: "validation",
  launch_marketing_investition: "launch",
  wachstum_expansion: "scaling",
  technologie_digitalisierung: "tech_digital",
  reifephase: "maturity",
  erneuerung_exit: "renewal",
};

export function workflowDashboardHrefForCategory(category: StudyCategoryKey): string {
  const phaseId = STUDY_CATEGORY_PHASE_ID[category];
  return `/dashboard?assistant_phase=${phaseId}#phase-${phaseId}`;
}

function getPhaseNameForCategory(category: StudyCategoryKey): string {
  const phaseId = STUDY_CATEGORY_PHASE_ID[category];
  const phase = PLANNING_PHASES.find((p) => p.id === phaseId);
  return phase?.name ?? phaseId;
}

export async function loadAssistantSteps(params: {
  companyId: string;
  participantId: string;
  participantCompletedFb1: boolean;
  participantCompletedFb5?: boolean;
  profileCompletePercent: number;
  locale: Locale;
  t: {
    common: { viewArtifacts: string };
    home: { handbookStep: string; companyProfile: string; stepLlm: string; step2: string; step5: string; step6: string };
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
    locale,
    t,
  } = params;
  // Use sequential access to avoid DB pool spikes on Supabase session poolers.
  const runs = await safeDb(() => prisma.run.findMany({ where: { companyId }, select: { status: true } }), []);
  const decisions = await safeDb(
    () => prisma.decision.count({ where: { companyId, status: { in: ["proposed", "approved"] } } }),
    0
  );
  const artifactsCount = await safeDb(() => prisma.artifact.count({ where: { companyId } }), 0);
  const sourcesCount = await safeDb(() => prisma.source.count({ where: { companyId } }), 0);
  const documentsCount = await safeDb(() => prisma.document.count({ where: { companyId } }), 0);
  const companySettings = await safeDb(
    () =>
      prisma.companySettings.findUnique({
        where: { companyId },
        select: { llmApiUrl: true, llmApiKey: true },
      }),
    null as { llmApiUrl: string | null; llmApiKey: string | null } | null
  );
  const scenarioEvaluationCount = await safeDb(() => prisma.scenarioEvaluation.count({ where: { companyId } }), 0);
  const fb2ByCategory = await safeDb(() => loadQuestionnaireCategories(participantId, "fb2"), [] as Array<{ category: string | null }>);
  const fb3ByCategory = await safeDb(() => loadQuestionnaireCategories(participantId, "fb3"), [] as Array<{ category: string | null }>);
  const fb4ByCategory = await safeDb(() => loadQuestionnaireCategories(participantId, "fb4"), [] as Array<{ category: string | null }>);
  const hasFb5Response = await safeDb(() => hasQuestionnaireResponse(participantId, "fb5"), false);

  const completedRuns = runs.filter((r) => ["complete", "approved"].includes(r.status)).length;
  const hasDocsUploaded = sourcesCount > 0 || documentsCount > 0;
  const hasLlmConfigured = Boolean(companySettings?.llmApiUrl?.trim()) || Boolean(companySettings?.llmApiKey?.trim());
  const hasArtifacts = artifactsCount > 0;
  const hasCompletedRuns = completedRuns > 0;
  const hasDecisions = decisions > 0;
  const hasEvaluation = scenarioEvaluationCount > 0;

  const studyCategories: StudyCategoryKey[] = [
    "markt_geschaeftsmodell",
    "produktstrategie",
    "launch_marketing_investition",
    "wachstum_expansion",
    "technologie_digitalisierung",
    "reifephase",
    "erneuerung_exit",
  ];
  const fb2DoneByCategory = new Set(fb2ByCategory.map((r) => String(r.category)).filter(Boolean));
  const fb3DoneByCategory = new Set(fb3ByCategory.map((r) => String(r.category)).filter(Boolean));
  const fb4DoneByCategory = new Set(fb4ByCategory.map((r) => String(r.category)).filter(Boolean));
  const fb5Done = Boolean(participantCompletedFb5) || hasFb5Response;

  const categoriesByPhase = new Map<string, StudyCategoryKey[]>();
  for (const category of studyCategories) {
    const phaseId = STUDY_CATEGORY_PHASE_ID[category];
    const existing = categoriesByPhase.get(phaseId) ?? [];
    existing.push(category);
    categoriesByPhase.set(phaseId, existing);
  }

  const studyFlowSteps: AssistantStep[] = PLANNING_PHASES.flatMap((phase) => {
    const phaseName =
      locale === "de"
        ? phase.name
        : (
            {
              ideation: "Ideation / Concept Phase",
              validation: "Validation Phase",
              launch: "Founding / Launch Phase",
              scaling: "Growth Phase",
              tech_digital: "Technology & Digitalization",
              maturity: "Maturity Phase",
              renewal: "Renewal / Exit / Transformation",
            } as Record<string, string>
          )[phase.id] ?? phase.name;
    const phaseCategories = categoriesByPhase.get(phase.id) ?? [];

    if (phaseCategories.length === 0) {
      return [
        {
          href: "/workflow-overview",
          label: `${t.study.studyInfoStep}: ${phaseName}`,
          completed: false,
        },
        {
          href: "/study/fb2",
          label: `${t.study.fb2Title} (${phaseName})`,
          completed: false,
        },
        {
          href: `/dashboard?assistant_phase=${phase.id}#phase-${phase.id}`,
          label: `${t.study.studyWorkflowStep}: ${phaseName}`,
          completed: hasCompletedRuns,
        },
        {
          href: `/artifacts#artifacts-phase-${phase.id}`,
          label: `${t.common.viewArtifacts}: ${phaseName}`,
          completed: hasArtifacts,
        },
        {
          href: "/study/fb3",
          label: `${t.study.fb3Title} (${phaseName})`,
          completed: false,
        },
        {
          href: "/study/fb4",
          label: `${t.study.fb4Title} (${phaseName})`,
          completed: false,
        },
      ];
    }

    const primaryCategory = phaseCategories[0];
    return [
      {
        href: `/study/info/${primaryCategory}`,
        label: `${t.study.studyInfoStep}: ${phaseName}`,
        completed: false,
      },
      ...phaseCategories.map((category) => ({
        href: `/study/fb2/${category}`,
        label: t.study.fb2Title,
        completed: fb2DoneByCategory.has(category),
      })),
      {
        href: `/dashboard?assistant_phase=${phase.id}#phase-${phase.id}`,
        label: `${t.study.studyWorkflowStep}: ${phaseName}`,
        completed: hasCompletedRuns,
      },
      {
        href: `/artifacts#artifacts-phase-${phase.id}`,
        label: `${t.common.viewArtifacts}: ${phaseName}`,
        completed: hasArtifacts,
      },
      ...phaseCategories.map((category) => ({
        href: `/study/fb3/${category}`,
        label: t.study.fb3Title,
        completed: fb3DoneByCategory.has(category),
      })),
      ...phaseCategories.map((category) => ({
        href: `/study/fb4/${category}`,
        label: t.study.fb4Title,
        completed: fb4DoneByCategory.has(category),
      })),
    ];
  });

  return [
    { href: "/manual", label: t.home.handbookStep, completed: false },
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

async function safeDb<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    // Avoid throwing in the homepage assistant when Supabase pool is saturated.
    console.warn("[assistantSteps] db query failed, using fallback.");
    return fallback;
  }
}

async function loadQuestionnaireCategories(participantId: string, questionnaireType: "fb2" | "fb3" | "fb4") {
  if (!participantId) return [];
  const delegate = (prisma as any).questionnaireResponse;
  try {
    if (delegate?.findMany) {
      return (await delegate.findMany({
        where: { participantId, questionnaireType, category: { not: null } },
        select: { category: true },
      })) as Array<{ category: string | null }>;
    }
  } catch (error) {
    console.error("[assistantSteps] loadQuestionnaireCategories delegate failed:", error);
  }

  const rows = await prisma.$queryRaw<Array<{ category: string | null }>>`
    SELECT "category"
    FROM "QuestionnaireResponse"
    WHERE "participantId" = ${participantId}
      AND "questionnaireType" = ${questionnaireType}
      AND "category" IS NOT NULL
  `;
  return rows;
}

async function hasQuestionnaireResponse(participantId: string, questionnaireType: "fb5"): Promise<boolean> {
  if (!participantId) return false;
  const delegate = (prisma as any).questionnaireResponse;
  try {
    if (delegate?.findFirst) {
      const row = await delegate.findFirst({
        where: { participantId, questionnaireType, category: null },
        select: { id: true },
      });
      return Boolean(row);
    }
  } catch (error) {
    console.error("[assistantSteps] hasQuestionnaireResponse delegate failed:", error);
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "QuestionnaireResponse"
    WHERE "participantId" = ${participantId}
      AND "questionnaireType" = ${questionnaireType}
      AND "category" IS NULL
    LIMIT 1
  `;
  return rows.length > 0;
}
