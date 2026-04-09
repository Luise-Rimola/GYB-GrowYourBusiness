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
  const invBase = steps.find((s) => s.stepKey === "inventory_baseline");
  const invProc = steps.find((s) => s.stepKey === "inventory_process_analysis");
  const invMarket = steps.find((s) => s.stepKey === "market_entry_equipment");
  if (stepKey === "inventory_process_analysis" && invBase?.parsedOutputJson) {
    result.inventory_baseline = invBase.parsedOutputJson;
  }
  if (stepKey === "market_entry_equipment") {
    if (invBase?.parsedOutputJson) result.inventory_baseline = invBase.parsedOutputJson;
    if (invProc?.parsedOutputJson) result.inventory_process_analysis = invProc.parsedOutputJson;
  }
  if (stepKey === "equipment_scaling_roadmap") {
    if (invBase?.parsedOutputJson) result.inventory_baseline = invBase.parsedOutputJson;
    if (invProc?.parsedOutputJson) result.inventory_process_analysis = invProc.parsedOutputJson;
    if (invMarket?.parsedOutputJson) result.market_entry_equipment = invMarket.parsedOutputJson;
  }
  const funnelStep = steps.find((s) => s.stepKey === "conversion_funnel_analysis");
  if ((stepKey === "pmf_assessment" || stepKey === "growth_loops") && funnelStep?.parsedOutputJson) {
    result.conversion_funnel_analysis = funnelStep.parsedOutputJson;
  }
  return result;
}

export const workflowSteps: Record<
  string,
  { stepKey: string; schemaKey: SchemaKey | "business_form"; label: string }[]
> = {
  WF_BUSINESS_FORM: [{ stepKey: "business_form", schemaKey: "business_form", label: "Unternehmensprofil" }],
  WF_BASELINE: [
    { stepKey: "business_model_inference", schemaKey: "business_model_inference", label: "Geschäftsmodell-Einordnung" },
    { stepKey: "kpi_set_selection", schemaKey: "kpi_set_selection", label: "KPI-Auswahl" },
    { stepKey: "industry_research", schemaKey: "industry_research", label: "Branchen- und Standortdaten" },
  ],
  WF_MARKET: [{ stepKey: "market_snapshot", schemaKey: "market_snapshot", label: "Marktüberblick" }],
  WF_RESEARCH: [
    { stepKey: "market_research", schemaKey: "market_research", label: "Marktforschung" },
    { stepKey: "best_practices", schemaKey: "best_practices", label: "Bewährte Vorgehensweisen" },
    { stepKey: "failure_reasons", schemaKey: "failure_reasons", label: "Warum Unternehmen scheitern" },
  ],
  WF_DIAGNOSTIC: [{ stepKey: "root_cause_trees", schemaKey: "root_cause_trees", label: "Ursachenbäume" }],
  WF_NEXT_BEST_ACTIONS: [{ stepKey: "decision_engine", schemaKey: "decision_pack", label: "Entscheidungslogik" }],
  WF_MARKETING_STRATEGY: [
    { stepKey: "marketing_strategy", schemaKey: "marketing_strategy", label: "Marketing Strategie" },
    { stepKey: "conversion_funnel_analysis", schemaKey: "conversion_funnel_analysis", label: "Conversion Funnel Analyse" },
    { stepKey: "social_media_content_plan", schemaKey: "social_media_content_plan", label: "Social Media Content Plan" },
  ],
  WF_KPI_ESTIMATION: [{ stepKey: "kpi_estimation", schemaKey: "kpi_estimation", label: "KPI-Schätzung" }],
  WF_DATA_COLLECTION_PLAN: [
    { stepKey: "kpi_computation_plan", schemaKey: "kpi_questions", label: "KPI-Fragenplan" },
    { stepKey: "data_strategy", schemaKey: "data_strategy", label: "Data Strategy" },
  ],
  WF_BUSINESS_PLAN: [
    { stepKey: "business_plan_executive", schemaKey: "business_plan_section", label: "Zusammenfassung" },
    { stepKey: "business_plan_market", schemaKey: "business_plan_section", label: "Marktanalyse" },
    { stepKey: "business_plan_marketing", schemaKey: "business_plan_section", label: "Marketingplan" },
    { stepKey: "business_plan_financial", schemaKey: "business_plan", label: "Finanzszenarien" },
    { stepKey: "business_plan_risk", schemaKey: "business_plan_section", label: "Risikoanalyse" },
  ],
  WF_MENU_CARD: [{ stepKey: "menu_card", schemaKey: "menu_card", label: "Angebotskatalog (Intro + Vollständig)" }],
  WF_SUPPLIER_LIST: [{ stepKey: "supplier_list", schemaKey: "supplier_list", label: "Lieferantenliste" }],
  WF_MENU_COST: [{ stepKey: "menu_cost", schemaKey: "menu_cost", label: "Warenkosten" }],
  WF_MENU_PRICING: [
    { stepKey: "menu_card", schemaKey: "menu_card", label: "Menü" },
    { stepKey: "supplier_list", schemaKey: "supplier_list", label: "Lieferanten" },
    { stepKey: "menu_cost", schemaKey: "menu_cost", label: "Warenkosten" },
    { stepKey: "menu_preiskalkulation", schemaKey: "menu_preiskalkulation", label: "Preiskalkulation" },
  ],
  WF_REAL_ESTATE: [{ stepKey: "real_estate", schemaKey: "real_estate", label: "Standortoptionen" }],
  WF_STARTUP_CONSULTING: [
    { stepKey: "startup_consulting", schemaKey: "startup_consulting", label: "Finanzierung & Gründung" },
    { stepKey: "capital_strategy", schemaKey: "capital_strategy", label: "Capital Strategy" },
  ],
  WF_IDEA_USP_VALIDATION: [{ stepKey: "value_proposition", schemaKey: "value_proposition", label: "Idee- und USP-Check" }],
  WF_FEASIBILITY_VALIDATION: [{ stepKey: "scenario_analysis", schemaKey: "scenario_analysis", label: "Machbarkeit & Voraussetzungen" }],
  WF_PATENT_CHECK: [{ stepKey: "strategic_options", schemaKey: "strategic_options", label: "Patentierbarkeit & Quellenprüfung" }],
  WF_LEGAL_FOUNDATION: [{ stepKey: "startup_consulting", schemaKey: "startup_consulting", label: "Rechtsrahmen & Unternehmensform" }],
  WF_CUSTOMER_VALIDATION: [{ stepKey: "customer_validation", schemaKey: "customer_validation", label: "Kundenvalidierung" }],
  WF_PROCESS_OPTIMIZATION: [
    { stepKey: "process_optimization", schemaKey: "process_optimization", label: "Prozessoptimierung" },
    { stepKey: "customer_experience_cx", schemaKey: "customer_experience_cx", label: "Customer Experience (CX)" },
    { stepKey: "organization_roles", schemaKey: "organization_roles", label: "Organisation & Rollen" },
    { stepKey: "hiring_talent_strategy", schemaKey: "hiring_talent_strategy", label: "Hiring & Talent Strategie" },
  ],
  WF_STRATEGIC_OPTIONS: [{ stepKey: "strategic_options", schemaKey: "strategic_options", label: "Strategische Optionen" }],
  WF_VALUE_PROPOSITION: [{ stepKey: "value_proposition", schemaKey: "value_proposition", label: "Wertversprechen & Problem-Lösungs-Fit" }],
  WF_GO_TO_MARKET: [{ stepKey: "go_to_market", schemaKey: "go_to_market", label: "Markteintritt & Preisstrategie" }],
  WF_SCALING_STRATEGY: [
    { stepKey: "scaling_strategy", schemaKey: "scaling_strategy", label: "Skalierungsstrategie" },
    { stepKey: "customer_economics_ltv_cac", schemaKey: "customer_economics_ltv_cac", label: "LTV/CAC Analyse" },
    { stepKey: "pmf_assessment", schemaKey: "pmf_assessment", label: "PMF Assessment" },
    { stepKey: "growth_loops", schemaKey: "growth_loops", label: "Growth Loops" },
  ],
  WF_GROWTH_MARGIN_OPTIMIZATION: [
    { stepKey: "growth_margin_optimization", schemaKey: "growth_margin_optimization", label: "Marge, Angebot & Kostenoptimierung" },
  ],
  WF_PORTFOLIO_MANAGEMENT: [{ stepKey: "portfolio_management", schemaKey: "portfolio_management", label: "Portfolio- & Markenstrategie" }],
  WF_SCENARIO_ANALYSIS: [{ stepKey: "scenario_analysis", schemaKey: "scenario_analysis", label: "Szenario- & Risikoanalyse" }],
  WF_OPERATIVE_PLAN: [{ stepKey: "operative_plan", schemaKey: "operative_plan", label: "Operativer Plan" }],
  WF_COMPETITOR_ANALYSIS: [{ stepKey: "competitor_analysis", schemaKey: "competitor_analysis", label: "Wettbewerbsanalyse" }],
  WF_SWOT: [{ stepKey: "swot_analysis", schemaKey: "swot_analysis", label: "SWOT-Analyse" }],
  WF_FINANCIAL_PLANNING: [
    { stepKey: "work_processes", schemaKey: "work_processes", label: "Arbeitsprozesse (Planung → Einkauf → Endkunde)" },
    { stepKey: "personnel_plan", schemaKey: "personnel_plan", label: "Personalplan & Personalkosten" },
    { stepKey: "business_model_mechanics", schemaKey: "business_model_mechanics", label: "Business Model Mechanics" },
    { stepKey: "financial_liquidity", schemaKey: "financial_liquidity", label: "Liquiditätsplan" },
    { stepKey: "financial_profitability", schemaKey: "financial_profitability", label: "Rentabilitätsplan" },
    { stepKey: "financial_capital", schemaKey: "financial_capital", label: "Kapitalbedarf" },
    { stepKey: "financial_break_even", schemaKey: "financial_break_even", label: "Break-Even-Analyse" },
    { stepKey: "financial_monthly_h1", schemaKey: "financial_monthly_projection", label: "Monatsprognose 1–6" },
    { stepKey: "financial_monthly_h2", schemaKey: "financial_monthly_projection", label: "Monatsprognose 7–12" },
  ],
  WF_STRATEGIC_PLANNING: [
    { stepKey: "strategic_planning", schemaKey: "strategic_planning", label: "Strategische Planung" },
    { stepKey: "barriers_to_entry", schemaKey: "barriers_to_entry", label: "Barriers to Entry" },
    { stepKey: "moat_assessment", schemaKey: "moat_assessment", label: "Moat Assessment" },
  ],
  WF_TREND_ANALYSIS: [
    { stepKey: "trend_analysis", schemaKey: "trend_analysis", label: "Trendanalyse" },
    { stepKey: "pestel_analysis", schemaKey: "pestel_analysis", label: "PESTEL-Analyse" },
  ],
  WF_TECH_DIGITALIZATION: [{ stepKey: "tech_digitalization", schemaKey: "tech_digitalization", label: "Technologie & Digitalisierung" }],
  WF_AUTOMATION_ROI: [{ stepKey: "automation_roi", schemaKey: "automation_roi", label: "Computer-Automatisierung & ROI" }],
  WF_PHYSICAL_AUTOMATION: [{ stepKey: "physical_automation", schemaKey: "physical_automation", label: "Physische Prozess-Automatisierung" }],
  WF_INVENTORY_LAUNCH: [
    { stepKey: "inventory_baseline", schemaKey: "inventory_baseline", label: "Inventarliste & Unternehmensform" },
    { stepKey: "inventory_process_analysis", schemaKey: "inventory_process_analysis", label: "Prozesse & Inventar" },
    { stepKey: "market_entry_equipment", schemaKey: "market_entry_equipment", label: "Markteintritt: fehlendes Equipment" },
    { stepKey: "equipment_scaling_roadmap", schemaKey: "equipment_scaling_roadmap", label: "Effizienz & Skalierung" },
  ],
  WF_APP_DEVELOPMENT: [
    { stepKey: "app_ideas", schemaKey: "app_project_plan", label: "App-Ideen & Projektplanung" },
    { stepKey: "app_requirements", schemaKey: "app_requirements", label: "Anforderungen" },
    { stepKey: "app_tech_spec", schemaKey: "app_tech_spec", label: "Technische Spezifikation" },
    { stepKey: "app_mvp_guide", schemaKey: "app_mvp_guide", label: "MVP-Anleitung für Entwickler" },
    { stepKey: "app_page_specs", schemaKey: "app_page_specs", label: "Seiten-Spezifikation (Inhalt & Funktionen)" },
    { stepKey: "app_db_schema", schemaKey: "app_db_schema", label: "Datenbank-Aufbau" },
  ],
};

/** Steps that require manual user input (forms) – cannot be auto-run via LLM */
export const MANUAL_STEP_KEYS = new Set(["business_form", "kpi_questions_answer"]);
