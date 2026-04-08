import { prisma } from "@/lib/prisma";
import { WIZARD_WORKFLOW_ORDER } from "@/lib/planningFramework";
import { unlockAllWorkflowsFromEnv } from "@/lib/workflowUnlock";
import { workflowSteps } from "@/lib/workflowSteps";

const WORKFLOW_STEPS: Record<string, { stepKey: string; label: string }[]> = Object.fromEntries(
  Object.entries(workflowSteps).map(([workflowKey, steps]) => [
    workflowKey,
    steps.map((step) => ({ stepKey: step.stepKey, label: step.label })),
  ])
);

export type ProgressStep = {
  id: string;
  label: string;
  workflowKey?: string;
  stepKey?: string;
  completed: boolean;
  url: string;
  isNext: boolean;
};

export type ProgressState = {
  steps: ProgressStep[];
  nextUrl: string;
};

export async function getProgressState(companyId: string): Promise<ProgressState> {
  const [intakeSession, profile, runs, companyKpiSet] = await Promise.all([
    prisma.intakeSession.findFirst({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.companyProfile.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    }),
    prisma.run.findMany({
      where: { companyId },
      include: { steps: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.companyKpiSet.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    }),
  ]);

  const intakeComplete = intakeSession?.status === "complete" && (profile?.completenessScore ?? 0) >= 0.5;
  const hasBaseline = runs.some((r) => r.workflowKey === "WF_BASELINE" && r.status === "complete");
  const hasKpiSet = !!companyKpiSet;

  const artifacts = await prisma.artifact.findMany({ where: { companyId } });
  const hasMarketSnapshot = artifacts.some((a) => a.type === "market");
  const hasFailureAnalysis = artifacts.some((a) => a.type === "failure_analysis");
  const hasSupplierList = artifacts.some((a) => a.type === "supplier_list");
  const hasMenuCard = artifacts.some((a) => a.type === "menu_card");
  const hasRealEstate = artifacts.some((a) => a.type === "real_estate");
  const hasResearch = artifacts.some((a) => a.type === "market_research") && hasFailureAnalysis;
  const hasBusinessPlanPrereqs = hasBaseline && hasFailureAnalysis && hasSupplierList && hasRealEstate;

  const runsByWorkflow = Object.fromEntries(
    WIZARD_WORKFLOW_ORDER.map((key) => [
      key,
      runs.filter((r) => r.workflowKey === key).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ])
  );

  const steps: ProgressStep[] = [];
  let nextUrl = "/intake";
  let foundNext = false;

  // 1. Intake
  steps.push({
    id: "intake",
    label: "Intake form",
    completed: intakeComplete,
    url: "/intake",
    isNext: !intakeComplete && !foundNext,
  });
  if (!intakeComplete && !foundNext) {
    nextUrl = "/intake";
    foundNext = true;
  }

  // 2. Workflow steps
  for (const workflowKey of WIZARD_WORKFLOW_ORDER) {
    const wfSteps = WORKFLOW_STEPS[workflowKey] ?? [];
    const workflowRuns = runsByWorkflow[workflowKey] ?? [];
    const latestRun = workflowRuns[0];
    const runSteps = latestRun?.steps ?? [];

    const completedStepKeys = new Set<string>();
    for (const s of runSteps) {
      if (s.schemaValidationPassed) completedStepKeys.add(s.stepKey);
    }
    if (workflowKey === "WF_BUSINESS_FORM" && intakeComplete) {
      completedStepKeys.add("business_form");
    }

    const runComplete = latestRun?.status === "complete";
    const needsBaselineAndMarket = [
      "WF_RESEARCH", "WF_MENU_CARD", "WF_SUPPLIER_LIST", "WF_REAL_ESTATE", "WF_CUSTOMER_VALIDATION",
      "WF_VALUE_PROPOSITION", "WF_GO_TO_MARKET", "WF_SWOT", "WF_COMPETITOR_ANALYSIS",
      "WF_STRATEGIC_PLANNING", "WF_TREND_ANALYSIS",
    ].includes(workflowKey);
    const noPrereqs = ["WF_BUSINESS_FORM", "WF_DATA_COLLECTION_PLAN", "WF_STARTUP_CONSULTING"];
    let isLocked =
      (workflowKey === "WF_BASELINE" && !intakeComplete) ||
      (!noPrereqs.includes(workflowKey) && workflowKey !== "WF_BASELINE" && !hasBaseline) ||
      (needsBaselineAndMarket && !hasMarketSnapshot) ||
      (workflowKey === "WF_MARKET" && !hasBaseline) ||
      (workflowKey === "WF_NEXT_BEST_ACTIONS" && (!hasKpiSet || !hasResearch)) ||
      (workflowKey === "WF_BUSINESS_PLAN" && !hasBusinessPlanPrereqs) ||
      (workflowKey === "WF_MENU_COST" && (!hasMenuCard || !hasSupplierList)) ||
      (workflowKey === "WF_MENU_PRICING" && (!hasBaseline || !hasMarketSnapshot));
    if (unlockAllWorkflowsFromEnv()) isLocked = false;

    for (let i = 0; i < wfSteps.length; i++) {
      const { stepKey, label } = wfSteps[i];
      const stepId = `${workflowKey}:${stepKey}`;

      let completed = false;
      if (runComplete) {
        completed = true;
      } else if (workflowKey === "WF_BUSINESS_FORM" && stepKey === "business_form") {
        completed = intakeComplete;
      } else {
        completed = completedStepKeys.has(stepKey);
      }

      let url = "/dashboard";
      if (latestRun) {
        url = `/runs/${latestRun.id}?step=${i}`;
      }

      const isNext = !foundNext && !completed && !isLocked;
      if (isNext) {
        nextUrl = url;
        foundNext = true;
      }

      steps.push({
        id: stepId,
        label: `${workflowKey.replace("WF_", "")}: ${label}`,
        workflowKey,
        stepKey,
        completed,
        url,
        isNext,
      });
    }
  }

  if (!foundNext) {
    nextUrl = "/dashboard";
  }

  return { steps, nextUrl };
}
