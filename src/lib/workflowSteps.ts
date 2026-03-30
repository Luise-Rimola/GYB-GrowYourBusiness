import { SchemaKey } from "@/types/schemas";

const FINANCIAL_MONTHLY_STEPS = ["financial_monthly_h1", "financial_monthly_h2"];

export function mergeRunStepsIntoContext(
  base: Record<string, unknown>,
  steps: { stepKey: string; parsedOutputJson: unknown }[],
  stepKey: string
) {
  const planStep = steps.find((s) => s.stepKey === "kpi_computation_plan");
  const answersStep = steps.find((s) => s.stepKey === "kpi_questions_answer");
  const gapStep = steps.find((s) => s.stepKey === "kpi_gap_scan");
  const workProcessesStep = steps.find((s) => s.stepKey === "work_processes");
  const personnelStep = steps.find((s) => s.stepKey === "personnel_plan");
  const result: Record<string, unknown> = {
    ...base,
    kpi_computation_plan: planStep?.parsedOutputJson ?? null,
    kpi_answers: answersStep?.parsedOutputJson ?? null,
  };
  if (stepKey === "industry_research") {
    result.kpi_gap_report = gapStep?.parsedOutputJson ?? null;
  }
  if ((stepKey === "personnel_plan" || FINANCIAL_MONTHLY_STEPS.includes(stepKey)) && workProcessesStep?.parsedOutputJson) {
    result.work_processes = workProcessesStep.parsedOutputJson;
  }
  if ((stepKey === "financial_planning" || FINANCIAL_MONTHLY_STEPS.includes(stepKey)) && personnelStep?.parsedOutputJson) {
    result.personnel_plan = personnelStep.parsedOutputJson;
  }
  const appIdeasStep = steps.find((s) => s.stepKey === "app_ideas");
  const appReqsStep = steps.find((s) => s.stepKey === "app_requirements");
  const appTechStep = steps.find((s) => s.stepKey === "app_tech_spec");
  const appMvpStep = steps.find((s) => s.stepKey === "app_mvp_guide");
  const appPagesStep = steps.find((s) => s.stepKey === "app_page_specs");
  const APP_STEPS = ["app_requirements", "app_tech_spec", "app_mvp_guide", "app_page_specs", "app_db_schema"];
  if (APP_STEPS.includes(stepKey) && appIdeasStep?.parsedOutputJson) {
    result.app_project_plan = appIdeasStep.parsedOutputJson;
  }
  if (["app_tech_spec", "app_mvp_guide", "app_page_specs", "app_db_schema"].includes(stepKey) && appReqsStep?.parsedOutputJson) {
    result.app_requirements = appReqsStep.parsedOutputJson;
  }
  if (["app_mvp_guide", "app_page_specs", "app_db_schema"].includes(stepKey) && appTechStep?.parsedOutputJson) {
    result.app_tech_spec = appTechStep.parsedOutputJson;
  }
  if (["app_page_specs", "app_db_schema"].includes(stepKey) && appMvpStep?.parsedOutputJson) {
    result.app_mvp_guide = appMvpStep.parsedOutputJson;
  }
  if (stepKey === "app_db_schema" && appPagesStep?.parsedOutputJson) {
    result.app_page_specs = appPagesStep.parsedOutputJson;
  }
  return result;
}

export const workflowSteps: Record<
  string,
  { stepKey: string; schemaKey: SchemaKey | "business_form"; label: string }[]
> = {
  WF_BUSINESS_FORM: [{ stepKey: "business_form", schemaKey: "business_form", label: "Business form" }],
  WF_BASELINE: [
    { stepKey: "business_model_inference", schemaKey: "business_model_inference", label: "Business model inference" },
    { stepKey: "kpi_set_selection", schemaKey: "kpi_set_selection", label: "KPI set selection" },
    { stepKey: "kpi_computation_plan", schemaKey: "kpi_questions", label: "KPI computation plan" },
    { stepKey: "kpi_questions_answer", schemaKey: "kpi_answers", label: "Answer KPI questions" },
    { stepKey: "kpi_gap_scan", schemaKey: "kpi_gap_report", label: "KPI gap scan" },
    { stepKey: "industry_research", schemaKey: "industry_research", label: "Industry & location data" },
  ],
  WF_MARKET: [{ stepKey: "market_snapshot", schemaKey: "market_snapshot", label: "Marktüberblick" }],
  WF_RESEARCH: [
    { stepKey: "market_research", schemaKey: "market_research", label: "Marktforschung" },
    { stepKey: "best_practices", schemaKey: "best_practices", label: "Bewährte Vorgehensweisen" },
    { stepKey: "failure_reasons", schemaKey: "failure_reasons", label: "Warum Unternehmen scheitern" },
  ],
  WF_DIAGNOSTIC: [{ stepKey: "root_cause_trees", schemaKey: "root_cause_trees", label: "Root cause trees" }],
  WF_NEXT_BEST_ACTIONS: [{ stepKey: "decision_engine", schemaKey: "decision_pack", label: "Decision engine" }],
  WF_MARKETING_STRATEGY: [{ stepKey: "marketing_strategy", schemaKey: "marketing_strategy", label: "Marketing Strategie" }],
  WF_KPI_ESTIMATION: [{ stepKey: "kpi_estimation", schemaKey: "kpi_estimation", label: "KPI estimation" }],
  WF_DATA_COLLECTION_PLAN: [{ stepKey: "kpi_computation_plan", schemaKey: "kpi_questions", label: "KPI computation plan" }],
  WF_BUSINESS_PLAN: [
    { stepKey: "business_plan_executive", schemaKey: "business_plan_section", label: "Executive Summary" },
    { stepKey: "business_plan_market", schemaKey: "business_plan_section", label: "Market Analysis" },
    { stepKey: "business_plan_marketing", schemaKey: "business_plan_section", label: "Marketing Plan" },
    { stepKey: "business_plan_financial", schemaKey: "business_plan", label: "Financial Scenarios" },
    { stepKey: "business_plan_risk", schemaKey: "business_plan_section", label: "Risk Analysis" },
  ],
  WF_MENU_CARD: [{ stepKey: "menu_card", schemaKey: "menu_card", label: "Angebotskatalog (Intro + Vollständig)" }],
  WF_SUPPLIER_LIST: [{ stepKey: "supplier_list", schemaKey: "supplier_list", label: "Supplier list" }],
  WF_MENU_COST: [{ stepKey: "menu_cost", schemaKey: "menu_cost", label: "Warenkosten" }],
  WF_MENU_PRICING: [
    { stepKey: "menu_card", schemaKey: "menu_card", label: "Menü" },
    { stepKey: "supplier_list", schemaKey: "supplier_list", label: "Lieferanten" },
    { stepKey: "menu_cost", schemaKey: "menu_cost", label: "Warenkosten" },
    { stepKey: "menu_preiskalkulation", schemaKey: "menu_preiskalkulation", label: "Preiskalkulation" },
  ],
  WF_REAL_ESTATE: [{ stepKey: "real_estate", schemaKey: "real_estate", label: "Real estate options" }],
  WF_STARTUP_CONSULTING: [{ stepKey: "startup_consulting", schemaKey: "startup_consulting", label: "Funding" }],
  WF_IDEA_USP_VALIDATION: [{ stepKey: "value_proposition", schemaKey: "value_proposition", label: "Idee- und USP-Check" }],
  WF_FEASIBILITY_VALIDATION: [{ stepKey: "scenario_analysis", schemaKey: "scenario_analysis", label: "Machbarkeit & Voraussetzungen" }],
  WF_PATENT_CHECK: [{ stepKey: "strategic_options", schemaKey: "strategic_options", label: "Patentierbarkeit & Quellenprüfung" }],
  WF_LEGAL_FOUNDATION: [{ stepKey: "startup_consulting", schemaKey: "startup_consulting", label: "Rechtsrahmen & Unternehmensform" }],
  WF_CUSTOMER_VALIDATION: [{ stepKey: "customer_validation", schemaKey: "customer_validation", label: "Customer validation" }],
  WF_PROCESS_OPTIMIZATION: [{ stepKey: "process_optimization", schemaKey: "process_optimization", label: "Process optimization" }],
  WF_STRATEGIC_OPTIONS: [{ stepKey: "strategic_options", schemaKey: "strategic_options", label: "Strategic options" }],
  WF_VALUE_PROPOSITION: [{ stepKey: "value_proposition", schemaKey: "value_proposition", label: "Value Proposition & Problem-Solution-Fit" }],
  WF_GO_TO_MARKET: [{ stepKey: "go_to_market", schemaKey: "go_to_market", label: "Go-to-Market & Pricing" }],
  WF_SCALING_STRATEGY: [{ stepKey: "scaling_strategy", schemaKey: "scaling_strategy", label: "Scaling strategy" }],
  WF_PORTFOLIO_MANAGEMENT: [{ stepKey: "portfolio_management", schemaKey: "portfolio_management", label: "Portfolio & Brand strategy" }],
  WF_SCENARIO_ANALYSIS: [{ stepKey: "scenario_analysis", schemaKey: "scenario_analysis", label: "Scenario & Risk analysis" }],
  WF_OPERATIVE_PLAN: [{ stepKey: "operative_plan", schemaKey: "operative_plan", label: "Operative plan" }],
  WF_COMPETITOR_ANALYSIS: [{ stepKey: "competitor_analysis", schemaKey: "competitor_analysis", label: "Competitor analysis" }],
  WF_SWOT: [{ stepKey: "swot_analysis", schemaKey: "swot_analysis", label: "SWOT analysis" }],
  WF_FINANCIAL_PLANNING: [
    { stepKey: "work_processes", schemaKey: "work_processes", label: "Arbeitsprozesse (Planung → Einkauf → Endkunde)" },
    { stepKey: "personnel_plan", schemaKey: "personnel_plan", label: "Personalplan & Personalkosten" },
    { stepKey: "financial_liquidity", schemaKey: "financial_liquidity", label: "Liquiditätsplan" },
    { stepKey: "financial_profitability", schemaKey: "financial_profitability", label: "Rentabilitätsplan" },
    { stepKey: "financial_capital", schemaKey: "financial_capital", label: "Kapitalbedarf" },
    { stepKey: "financial_break_even", schemaKey: "financial_break_even", label: "Break-Even-Analyse" },
    { stepKey: "financial_monthly_h1", schemaKey: "financial_monthly_projection", label: "Monatsprognose 1–6" },
    { stepKey: "financial_monthly_h2", schemaKey: "financial_monthly_projection", label: "Monatsprognose 7–12" },
  ],
  WF_STRATEGIC_PLANNING: [{ stepKey: "strategic_planning", schemaKey: "strategic_planning", label: "Strategic planning" }],
  WF_TREND_ANALYSIS: [{ stepKey: "trend_analysis", schemaKey: "trend_analysis", label: "Trend analysis" }],
  WF_TECH_DIGITALIZATION: [{ stepKey: "tech_digitalization", schemaKey: "tech_digitalization", label: "Technologie & Digitalisierung" }],
  WF_AUTOMATION_ROI: [{ stepKey: "automation_roi", schemaKey: "automation_roi", label: "Computer-Automatisierung & ROI" }],
  WF_PHYSICAL_AUTOMATION: [{ stepKey: "physical_automation", schemaKey: "physical_automation", label: "Physische Prozess-Automatisierung" }],
  WF_APP_DEVELOPMENT: [
    { stepKey: "app_ideas", schemaKey: "app_project_plan", label: "App-Ideen & Projektplanung" },
    { stepKey: "app_requirements", schemaKey: "app_requirements", label: "Requirements Engineering" },
    { stepKey: "app_tech_spec", schemaKey: "app_tech_spec", label: "Technische Spezifikation" },
    { stepKey: "app_mvp_guide", schemaKey: "app_mvp_guide", label: "MVP-Anleitung für Entwickler" },
    { stepKey: "app_page_specs", schemaKey: "app_page_specs", label: "Seiten-Spezifikation (Inhalt & Funktionen)" },
    { stepKey: "app_db_schema", schemaKey: "app_db_schema", label: "Datenbank-Aufbau" },
  ],
};

/** Steps that require manual user input (forms) – cannot be auto-run via LLM */
export const MANUAL_STEP_KEYS = new Set(["business_form", "kpi_questions_answer"]);
