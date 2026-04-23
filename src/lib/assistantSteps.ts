import { prisma } from "@/lib/prisma";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { workflowSteps } from "@/lib/workflowSteps";
import { isRunProcessFullyComplete } from "@/lib/runProcessCompletion";
import { type StudyCategoryKey } from "@/lib/studyCategoryContext";
import type { Locale } from "@/lib/i18n";

export type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
};

type RunStepState = { stepKey: string; schemaValidationPassed: boolean; createdAt: Date };

function pickPreferredStepStates(steps: RunStepState[]) {
  const byKey = new Map<string, RunStepState[]>();
  for (const step of steps) {
    const list = byKey.get(step.stepKey) ?? [];
    list.push(step);
    byKey.set(step.stepKey, list);
  }
  const preferred = new Map<string, { schemaValidationPassed: boolean; createdAt: Date }>();
  for (const [stepKey, list] of byKey.entries()) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const chosen = list.find((step) => step.schemaValidationPassed) ?? list[0];
    preferred.set(stepKey, {
      schemaValidationPassed: chosen.schemaValidationPassed,
      createdAt: chosen.createdAt,
    });
  }
  return preferred;
}

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
  includeHandbookStep?: boolean;
  t: {
    common: { viewArtifacts: string };
    home: {
      handbookStep: string;
      companyProfile: string;
      stepLlm: string;
      step2: string;
      step5: string;
      step6: string;
      step7Mail: string;
    };
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
    includeHandbookStep = true,
    t,
  } = params;
  // Use sequential access to avoid DB pool spikes on Supabase session poolers.
  const runs = await safeDb(
    () =>
      prisma.run.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          workflowKey: true,
          createdAt: true,
          steps: {
            select: {
              stepKey: true,
              schemaValidationPassed: true,
              createdAt: true,
            },
          },
        },
      }),
    [] as Array<{
      status: string;
      workflowKey: string;
      createdAt: Date;
      steps: RunStepState[];
    }>
  );
  const decisions = await safeDb(
    () => prisma.decision.count({ where: { companyId, status: { in: ["proposed", "approved"] } } }),
    0
  );
  const artifacts = await safeDb(
    () =>
      prisma.artifact.findMany({
        where: { companyId },
        select: { type: true, run: { select: { workflowKey: true } } },
      }),
    [] as Array<{ type: string; run: { workflowKey: string } | null }>
  );
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
  const hasArtifacts = artifacts.length > 0;
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

  const runsByWorkflow = new Map<
    string,
    Array<{ status: string; workflowKey: string; createdAt: Date; steps: RunStepState[] }>
  >();
  for (const run of runs) {
    const list = runsByWorkflow.get(run.workflowKey) ?? [];
    list.push(run);
    runsByWorkflow.set(run.workflowKey, list);
  }
  for (const [workflowKey, list] of runsByWorkflow.entries()) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    runsByWorkflow.set(workflowKey, list);
  }

  const workflowIsComplete = (workflowKey: string): boolean => {
    const wfRuns = runsByWorkflow.get(workflowKey) ?? [];
    if (wfRuns.length === 0) return false;
    if (wfRuns.some((r) => ["complete", "approved"].includes(r.status))) return true;
    const latestRun = wfRuns[0];
    const configuredSteps = workflowSteps[workflowKey] ?? [];
    const preferred = pickPreferredStepStates(latestRun.steps);
    const runStepsForComplete = [...preferred.entries()].map(([stepKey, v]) => ({
      stepKey,
      schemaValidationPassed: v.schemaValidationPassed,
    }));
    return isRunProcessFullyComplete(configuredSteps, runStepsForComplete);
  };

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
              maturity: "Strategy Phase",
              renewal: "Strategic Options / Exit / Transformation",
            } as Record<string, string>
          )[phase.id] ?? phase.name;
    const phaseCategories = categoriesByPhase.get(phase.id) ?? [];
    const phaseWorkflowKeys = new Set(phase.workflowKeys);
    const phaseHasCompletedRun = [...phaseWorkflowKeys]
      .filter((workflowKey) => workflowKey !== "WF_BUSINESS_FORM")
      .every((workflowKey) => workflowIsComplete(workflowKey));
    const phaseHasArtifacts = artifacts.some((a) => {
      const wfKey = a.run?.workflowKey;
      return Boolean(wfKey && phaseWorkflowKeys.has(wfKey));
    });

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
          completed: phaseHasCompletedRun,
        },
        {
          href: `/artifacts#artifacts-phase-${phase.id}`,
          label: `${t.common.viewArtifacts}: ${phaseName}`,
          completed: phaseHasArtifacts,
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
        completed: phaseHasCompletedRun,
      },
      {
        href: `/artifacts#artifacts-phase-${phase.id}`,
        label: `${t.common.viewArtifacts}: ${phaseName}`,
        completed: phaseHasArtifacts,
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
    { href: "/settings#llm-api", label: t.home.stepLlm, completed: hasLlmConfigured },
    ...(includeHandbookStep ? [{ href: "/manual", label: t.home.handbookStep, completed: false }] : []),
    { href: "/study/fb1", label: t.study.fb1Title, completed: participantCompletedFb1 },
    { href: "/profile", label: t.home.companyProfile, completed: profileCompletePercent >= 50 },
    { href: "/knowledge", label: t.home.step2, completed: hasDocsUploaded },
    ...studyFlowSteps,
    { href: "/decisions", label: t.home.step5, completed: hasDecisions },
    { href: "/evaluation", label: t.home.step6, completed: hasEvaluation },
    { href: "/study/fb5", label: t.study.fb5Title, completed: fb5Done },
    { href: "/home?openExport=1", label: t.home.step7Mail, completed: false },
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
