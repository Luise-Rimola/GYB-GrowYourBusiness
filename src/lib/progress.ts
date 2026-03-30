import { prisma } from "@/lib/prisma";
import { WIZARD_WORKFLOW_ORDER } from "@/lib/planningFramework";

const WORKFLOW_STEPS: Record<string, { stepKey: string; label: string }[]> = {
  WF_BUSINESS_FORM: [{ stepKey: "business_form", label: "Business form" }],
  WF_BASELINE: [
    { stepKey: "business_model_inference", label: "Business model" },
    { stepKey: "kpi_set_selection", label: "KPI set" },
    { stepKey: "kpi_computation_plan", label: "KPI plan" },
    { stepKey: "kpi_questions_answer", label: "KPI answers" },
    { stepKey: "kpi_gap_scan", label: "KPI gap scan" },
    { stepKey: "industry_research", label: "Industry research" },
  ],
  WF_MARKET: [{ stepKey: "market_snapshot", label: "Market snapshot" }],
  WF_RESEARCH: [
    { stepKey: "market_research", label: "Marktforschung" },
    { stepKey: "best_practices", label: "Bewährte Vorgehensweisen" },
    { stepKey: "failure_reasons", label: "Misserfolgsgründe" },
  ],
  WF_VALUE_PROPOSITION: [{ stepKey: "value_proposition", label: "Value Proposition" }],
  WF_COMPETITOR_ANALYSIS: [{ stepKey: "competitor_analysis", label: "Competitor analysis" }],
  WF_SWOT: [{ stepKey: "swot_analysis", label: "SWOT analysis" }],
  WF_TREND_ANALYSIS: [{ stepKey: "trend_analysis", label: "Trend analysis" }],
  WF_CUSTOMER_VALIDATION: [{ stepKey: "customer_validation", label: "Customer validation" }],
  WF_MENU_CARD: [{ stepKey: "menu_card", label: "Angebotskatalog" }],
  WF_SUPPLIER_LIST: [{ stepKey: "supplier_list", label: "Supplier list" }],
  WF_MENU_COST: [{ stepKey: "menu_cost", label: "Warenkosten" }],
  WF_MENU_PRICING: [
    { stepKey: "menu_card", label: "Menü" },
    { stepKey: "supplier_list", label: "Lieferanten" },
    { stepKey: "menu_cost", label: "Warenkosten" },
    { stepKey: "menu_preiskalkulation", label: "Preiskalkulation" },
  ],
  WF_REAL_ESTATE: [{ stepKey: "real_estate", label: "Real estate" }],
  WF_BUSINESS_PLAN: [
    { stepKey: "business_plan_executive", label: "Executive Summary" },
    { stepKey: "business_plan_market", label: "Market Analysis" },
    { stepKey: "business_plan_marketing", label: "Marketing Plan" },
    { stepKey: "business_plan_financial", label: "Financial Scenarios" },
    { stepKey: "business_plan_risk", label: "Risk Analysis" },
  ],
  WF_STARTUP_CONSULTING: [{ stepKey: "startup_consulting", label: "Funding" }],
  WF_GO_TO_MARKET: [{ stepKey: "go_to_market", label: "Go-to-Market & Pricing" }],
  WF_FINANCIAL_PLANNING: [
    { stepKey: "work_processes", label: "Arbeitsprozesse (Planung → Einkauf → Endkunde)" },
    { stepKey: "personnel_plan", label: "Personalplan & Personalkosten" },
    { stepKey: "financial_liquidity", label: "Liquiditätsplan" },
    { stepKey: "financial_profitability", label: "Rentabilitätsplan" },
    { stepKey: "financial_capital", label: "Kapitalbedarf" },
    { stepKey: "financial_break_even", label: "Break-Even-Analyse" },
    { stepKey: "financial_monthly_h1", label: "Monatsprognose 1–6" },
    { stepKey: "financial_monthly_h2", label: "Monatsprognose 7–12" },
  ],
  WF_DIAGNOSTIC: [{ stepKey: "root_cause_trees", label: "Root cause trees" }],
  WF_NEXT_BEST_ACTIONS: [{ stepKey: "decision_engine", label: "Decision engine" }],
  WF_MARKETING_STRATEGY: [{ stepKey: "marketing_strategy", label: "Marketing Strategie" }],
  WF_SCALING_STRATEGY: [{ stepKey: "scaling_strategy", label: "Scaling strategy" }],
  WF_PROCESS_OPTIMIZATION: [{ stepKey: "process_optimization", label: "Process optimization" }],
  WF_PORTFOLIO_MANAGEMENT: [{ stepKey: "portfolio_management", label: "Portfolio & Brand" }],
  WF_STRATEGIC_OPTIONS: [{ stepKey: "strategic_options", label: "Strategic options" }],
  WF_KPI_ESTIMATION: [{ stepKey: "kpi_estimation", label: "KPI estimation" }],
  WF_DATA_COLLECTION_PLAN: [{ stepKey: "kpi_computation_plan", label: "Data collection plan" }],
  WF_STRATEGIC_PLANNING: [{ stepKey: "strategic_planning", label: "Strategic planning" }],
  WF_SCENARIO_ANALYSIS: [{ stepKey: "scenario_analysis", label: "Scenario & Risk analysis" }],
  WF_OPERATIVE_PLAN: [{ stepKey: "operative_plan", label: "Operative plan" }],
};

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
    const isLocked =
      (workflowKey === "WF_BASELINE" && !intakeComplete) ||
      (!noPrereqs.includes(workflowKey) && workflowKey !== "WF_BASELINE" && !hasBaseline) ||
      (needsBaselineAndMarket && !hasMarketSnapshot) ||
      (workflowKey === "WF_MARKET" && !hasBaseline) ||
      (workflowKey === "WF_NEXT_BEST_ACTIONS" && (!hasKpiSet || !hasResearch)) ||
      (workflowKey === "WF_BUSINESS_PLAN" && !hasBusinessPlanPrereqs) ||
      (workflowKey === "WF_MENU_COST" && (!hasMenuCard || !hasSupplierList)) ||
      (workflowKey === "WF_MENU_PRICING" && (!hasBaseline || !hasMarketSnapshot));

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
