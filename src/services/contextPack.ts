import { prisma } from "@/lib/prisma";
import { startupInsights } from "@/lib/startupInsights";
import { AutoKpiService } from "@/services/autoKpi";
import { DATA_TO_WORKFLOWS, PLANNING_PHASES, WORKFLOW_TO_ARTIFACTS } from "@/lib/planningFramework";

export type ContextPack = {
  startup_insights: Record<string, unknown>;
  company_profile: Record<string, unknown> | null;
  industry_research: Record<string, unknown> | null;
  market_snapshot: Record<string, unknown> | null;
  failure_analysis: Record<string, unknown> | null;
  best_practices: Record<string, unknown> | null;
  market_research: Record<string, unknown> | null;
  supplier_list: Record<string, unknown> | null;
  menu_card: Record<string, unknown> | null;
  menu_cost: Record<string, unknown> | null;
  real_estate: Record<string, unknown> | null;
  baseline: Record<string, unknown> | null;
  business_plan: Record<string, unknown> | null;
  financial_planning: Record<string, unknown> | null;
  personnel_plan: Record<string, unknown> | null;
  work_processes: Record<string, unknown> | null;
  kpi_estimation: Record<string, unknown> | null;
  business_model: {
    type: string | null;
    confidence: number | null;
    stage: string | null;
    stage_confidence: number | null;
  };
  constraints: Record<string, unknown>;
  kpi_set: Record<string, unknown> | null;
  kpis_to_estimate: string[];
  kpi_input_fields: Array<Record<string, unknown>>;
  kpi_library_summary: Array<Record<string, unknown>>;
  strategy_indicators: Array<Record<string, unknown>>;
  indicator_mapping_rules: Array<Record<string, unknown>>;
  kpi_snapshot: Array<Record<string, unknown>>;
  targets: Array<Record<string, unknown>>;
  benchmarks: Array<Record<string, unknown>>;
  market_sources: Array<Record<string, unknown>>;
  /** @deprecated Nur noch leer — Metadaten-Liste war für die KI wenig nutzbar. */
  artifacts_summary: Array<Record<string, unknown>>;
  /** Vollständige contentJson-Outputs passender Vor-Analysen (je Typ letztes Artefakt). */
  related_analysis_outputs: Array<{
    artifact_type: string;
    title: string;
    content: Record<string, unknown>;
  }>;
  knowledge_retrieval: Record<string, unknown>;
  data_quality: Record<string, unknown>;
  decision_pack: Record<string, unknown> | null;
};

/** Wenn ein Workflow-Key fehlt: kein „voller“ Kontext mehr (früher: alles drin → KPI/Patent-Rauschen). */
const DEFAULT_WORKFLOW_CONTEXT_KEYS: (keyof ContextPack)[] = [
  "company_profile",
  "constraints",
  "business_model",
  "industry_research",
  "market_snapshot",
  "market_research",
  "related_analysis_outputs",
];

/**
 * Welche anderen Artefakt-Typen (jeweils letzte Version) als voller JSON-Body mitgegeben werden.
 * Leeres Array = bewusst keine Querverweise. Fehlender Key = Fallback __DEFAULT__ (nur wenn Whitelist related_analysis_outputs enthält).
 */
const RELATED_ARTIFACT_TYPES_BY_WORKFLOW: Record<string, readonly string[]> = {
  __DEFAULT__: [
    "swot_analysis",
    "competitor_analysis",
    "trend_analysis",
    "value_proposition",
    "scenario_analysis",
    "strategic_options",
    "market_research",
    "customer_validation",
    "go_to_market",
    "marketing_strategy",
  ],
  WF_MENU_CARD: [],
  WF_MENU_COST: [],
  WF_MENU_PRICING: [],
  WF_SUPPLIER_LIST: [],
  WF_REAL_ESTATE: [],
  WF_TECH_DIGITALIZATION: [],
  WF_AUTOMATION_ROI: [],
  WF_PHYSICAL_AUTOMATION: [],
  WF_INVENTORY_LAUNCH: [],
  WF_APP_DEVELOPMENT: [
    "value_proposition",
    "business_plan",
    "app_project_plan",
    "app_requirements",
    "app_tech_spec",
    "app_mvp_guide",
    "app_page_specs",
    "app_db_schema",
  ],
  WF_DATA_COLLECTION_PLAN: [],
  WF_BUSINESS_FORM: [],
  WF_BASELINE: [],
  WF_IDEA_USP_VALIDATION: [
    "market_research",
    "competitor_analysis",
    "swot_analysis",
    "trend_analysis",
    "scenario_analysis",
    "value_proposition",
    "baseline",
    "business_plan",
    "failure_analysis",
    "best_practices",
  ],
  WF_VALUE_PROPOSITION: [
    "market_research",
    "competitor_analysis",
    "swot_analysis",
    "trend_analysis",
    "scenario_analysis",
    "value_proposition",
    "baseline",
    "business_plan",
    "failure_analysis",
    "best_practices",
  ],
  WF_FEASIBILITY_VALIDATION: [
    "value_proposition",
    "market_research",
    "business_plan",
    "scenario_analysis",
    "financial_planning",
    "baseline",
    "swot_analysis",
    "competitor_analysis",
  ],
  WF_PATENT_CHECK: ["value_proposition", "business_plan", "market_research", "scenario_analysis", "strategic_options"],
  WF_LEGAL_FOUNDATION: [
    "value_proposition",
    "business_plan",
    "startup_guide",
    "strategic_options",
    "scenario_analysis",
  ],
  WF_CUSTOMER_VALIDATION: [
    "value_proposition",
    "go_to_market",
    "marketing_strategy",
    "scenario_analysis",
    "business_plan",
  ],
  WF_SWOT: ["competitor_analysis", "trend_analysis", "market_research", "value_proposition", "scenario_analysis"],
  WF_COMPETITOR_ANALYSIS: ["swot_analysis", "trend_analysis", "market_research", "value_proposition", "scenario_analysis"],
  WF_TREND_ANALYSIS: ["swot_analysis", "competitor_analysis", "market_research", "value_proposition", "scenario_analysis"],
  WF_SCENARIO_ANALYSIS: [
    "value_proposition",
    "swot_analysis",
    "business_plan",
    "baseline",
    "market_research",
    "competitor_analysis",
    "trend_analysis",
  ],
  WF_STRATEGIC_OPTIONS: [
    "business_plan",
    "scenario_analysis",
    "swot_analysis",
    "value_proposition",
    "market_research",
    "financial_planning",
  ],
  WF_PROCESS_OPTIMIZATION: ["baseline", "work_processes", "business_plan", "kpi_estimation", "market_research"],
  WF_DIAGNOSTIC: ["failure_analysis", "best_practices", "market_research", "scenario_analysis"],
  WF_NEXT_BEST_ACTIONS: [
    "swot_analysis",
    "competitor_analysis",
    "scenario_analysis",
    "value_proposition",
    "decision_pack",
    "business_plan",
  ],
  WF_OPERATIVE_PLAN: ["business_plan", "scenario_analysis", "scaling_strategy", "go_to_market", "baseline"],
  WF_STRATEGIC_PLANNING: ["swot_analysis", "scenario_analysis", "trend_analysis", "value_proposition", "business_plan"],
  WF_MARKETING_STRATEGY: ["value_proposition", "go_to_market", "business_plan", "decision_pack", "market_research"],
  WF_SCALING_STRATEGY: ["go_to_market", "marketing_strategy", "business_plan", "baseline", "scenario_analysis"],
  WF_GROWTH_MARGIN_OPTIMIZATION: [
    "go_to_market",
    "marketing_strategy",
    "business_plan",
    "baseline",
    "scenario_analysis",
    "menu_cost",
    "menu_preiskalkulation",
    "supplier_list",
    "financial_planning",
    "personnel_plan",
    "value_proposition",
    "kpi_estimation",
    "scaling_strategy",
    "process_optimization",
  ],
  WF_GROWTH_BUSINESS_SUMMARY: [
    "baseline",
    "market_research",
    "business_plan",
    "decision_pack",
  ],
  WF_GROWTH_OFFER_AUDIENCE_FUNNEL: [
    "value_proposition",
    "market_research",
    "marketing_strategy",
    "conversion_funnel_analysis",
    "social_media_content_plan",
    "go_to_market",
  ],
  WF_GROWTH_PAID_ADS: [
    "go_to_market",
    "marketing_strategy",
    "conversion_funnel_analysis",
    "social_media_content_plan",
    "decision_pack",
  ],
  WF_GROWTH_SEO: [
    "market_research",
    "value_proposition",
    "marketing_strategy",
    "go_to_market",
  ],
  WF_GROWTH_RETENTION_CONTENT: [
    "marketing_strategy",
    "conversion_funnel_analysis",
    "social_media_content_plan",
    "customer_validation",
    "go_to_market",
  ],
  WF_GROWTH_EXECUTION_PLAN: [
    "decision_pack",
    "marketing_strategy",
    "conversion_funnel_analysis",
    "social_media_content_plan",
    "go_to_market",
    "scaling_strategy",
    "growth_margin_optimization",
  ],
  WF_SUBSIDY_RESEARCH: [
    "startup_guide",
    "capital_strategy",
    "financial_planning",
    "business_plan",
    "market_research",
    "industry_research",
  ],
  WF_PORTFOLIO_MANAGEMENT: ["business_plan", "strategic_planning", "baseline", "market_research"],
  WF_GO_TO_MARKET: ["value_proposition", "business_plan", "market_research", "scenario_analysis", "swot_analysis"],
  WF_FINANCIAL_PLANNING: [
    "business_plan",
    "baseline",
    "scenario_analysis",
    "kpi_estimation",
    "value_proposition",
    "inventory_equipment_plan",
  ],
  WF_KPI_ESTIMATION: ["baseline", "business_plan", "financial_planning", "market_research", "value_proposition"],
  WF_BUSINESS_PLAN: [
    "swot_analysis",
    "competitor_analysis",
    "trend_analysis",
    "value_proposition",
    "scenario_analysis",
    "baseline",
    "go_to_market",
  ],
  WF_STARTUP_CONSULTING: ["business_plan", "value_proposition", "scenario_analysis", "market_research"],
  WF_MARKET: ["competitor_analysis", "trend_analysis", "market_research", "baseline"],
  WF_RESEARCH: ["competitor_analysis", "swot_analysis", "trend_analysis", "value_proposition", "baseline"],
};

const MAX_RELATED_OUTPUTS_BY_WORKFLOW: Record<string, number> = {
  __DEFAULT__: 6,
  WF_GROWTH_EXECUTION_PLAN: 10,
  WF_SUBSIDY_RESEARCH: 10,
  WF_NEXT_BEST_ACTIONS: 8,
  WF_BUSINESS_PLAN: 8,
  WF_SCALING_STRATEGY: 8,
};

const WORKFLOW_RETRIEVAL_HINTS: Record<string, string[]> = {
  WF_GROWTH_MARGIN_OPTIMIZATION: ["margin", "cost", "pricing", "offer", "conversion", "roi", "ltv", "cac"],
  WF_SCALING_STRATEGY: ["scaling", "ltv", "cac", "pmf", "growth", "funnel", "retention"],
  WF_MARKETING_STRATEGY: ["marketing", "channel", "content", "funnel", "campaign"],
  WF_GROWTH_PAID_ADS: ["meta", "google", "ads", "campaign", "tracking", "conversion"],
  WF_GROWTH_SEO: ["seo", "keyword", "content", "organic", "ranking", "technical"],
  WF_GROWTH_RETENTION_CONTENT: ["retention", "email", "sms", "content", "ugc", "creative"],
  WF_GROWTH_EXECUTION_PLAN: ["kpi", "roadmap", "execution", "30", "60", "90", "plan"],
  WF_SUBSIDY_RESEARCH: ["zuschuss", "foerderung", "grant", "subsidy", "funding", "antrag", "voraussetzung"],
  WF_NEXT_BEST_ACTIONS: ["decision", "priority", "risk", "roadmap", "execution"],
};

const WORKFLOW_PHASE_BY_KEY: Record<string, string> = Object.fromEntries(
  PLANNING_PHASES.flatMap((phase) => phase.workflowKeys.map((workflowKey) => [workflowKey, phase.id]))
);

const PRODUCER_WORKFLOWS_BY_ARTIFACT_TYPE: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const [workflowKey, artifactTypes] of Object.entries(WORKFLOW_TO_ARTIFACTS)) {
    for (const artifactType of artifactTypes) {
      if (!map[artifactType]) map[artifactType] = [];
      map[artifactType].push(workflowKey);
    }
  }
  return map;
})();

function workflowConsumesArtifactType(workflowKey: string, artifactType: string): boolean {
  return (DATA_TO_WORKFLOWS[artifactType] ?? []).includes(workflowKey);
}

function scoreArtifactForWorkflow(params: {
  workflowKey: string;
  preferredTypes: Set<string>;
  artifact: { type: string; title: string; contentJson: unknown; recencyRank: number };
}): number {
  const { workflowKey, preferredTypes, artifact } = params;
  let score = 0;
  if (preferredTypes.has(artifact.type)) score += 60;
  if (workflowConsumesArtifactType(workflowKey, artifact.type)) score += 30;

  const targetPhase = WORKFLOW_PHASE_BY_KEY[workflowKey];
  const producerWorkflows = PRODUCER_WORKFLOWS_BY_ARTIFACT_TYPE[artifact.type] ?? [];
  if (targetPhase && producerWorkflows.some((wf) => WORKFLOW_PHASE_BY_KEY[wf] === targetPhase)) {
    score += 15;
  }

  const hints = WORKFLOW_RETRIEVAL_HINTS[workflowKey] ?? [];
  if (hints.length > 0) {
    const haystack = [
      artifact.type,
      artifact.title,
      ...(artifact.contentJson && typeof artifact.contentJson === "object" && !Array.isArray(artifact.contentJson)
        ? Object.keys(artifact.contentJson as Record<string, unknown>)
        : []),
    ]
      .join(" ")
      .toLowerCase();
    let overlap = 0;
    for (const hint of hints) {
      if (haystack.includes(hint.toLowerCase())) overlap += 1;
    }
    score += Math.min(20, overlap * 4);
  }

  score += Math.max(0, 12 - artifact.recencyRank);
  return score;
}

function buildRelatedAnalysisRetrieval(
  artifacts: Array<{ type: string; title: string; contentJson: unknown; createdAt: Date }>,
  workflowKey: string,
): {
  outputs: Array<{ artifact_type: string; title: string; content: Record<string, unknown> }>;
  retrievedObjects: Array<Record<string, unknown>>;
} {
  const configuredTypes = RELATED_ARTIFACT_TYPES_BY_WORKFLOW[workflowKey] ?? RELATED_ARTIFACT_TYPES_BY_WORKFLOW.__DEFAULT__;
  if (!configuredTypes || configuredTypes.length === 0) {
    return { outputs: [], retrievedObjects: [] };
  }

  // newest artifact per type only
  const newestByType = new Map<string, { type: string; title: string; contentJson: unknown; createdAt: Date }>();
  for (const a of artifacts) {
    if (!newestByType.has(a.type)) newestByType.set(a.type, a);
  }
  const candidates = Array.from(newestByType.values())
    .filter((a) => a.contentJson && typeof a.contentJson === "object" && !Array.isArray(a.contentJson))
    .map((a, idx) => ({ ...a, recencyRank: idx + 1 }));

  const preferredTypes = new Set(configuredTypes);
  const scored = candidates
    .map((artifact) => ({
      artifact,
      score: scoreArtifactForWorkflow({ workflowKey, preferredTypes, artifact }),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const limit = MAX_RELATED_OUTPUTS_BY_WORKFLOW[workflowKey] ?? MAX_RELATED_OUTPUTS_BY_WORKFLOW.__DEFAULT__;
  const selected = scored.slice(0, limit);

  return {
    outputs: selected.map(({ artifact }) => ({
      artifact_type: artifact.type,
      title: artifact.title ?? artifact.type,
      content: artifact.contentJson as Record<string, unknown>,
    })),
    retrievedObjects: selected.map(({ artifact, score }) => ({
      artifact_type: artifact.type,
      title: artifact.title ?? artifact.type,
      retrieval_score: score,
      created_at: artifact.createdAt,
      reason: {
        preferred_match: preferredTypes.has(artifact.type),
        consumed_by_workflow: workflowConsumesArtifactType(workflowKey, artifact.type),
        same_phase_producer: (PRODUCER_WORKFLOWS_BY_ARTIFACT_TYPE[artifact.type] ?? []).some(
          (wf) => WORKFLOW_PHASE_BY_KEY[wf] === WORKFLOW_PHASE_BY_KEY[workflowKey]
        ),
      },
    })),
  };
}

/** Step-level whitelist: for WF_FINANCIAL_PLANNING sub-steps, only these fields. Reduces tokens significantly. */
const CONTEXT_WHITELIST_STEP: Partial<Record<string, Partial<Record<string, (keyof ContextPack)[]>>>> = {
  WF_FINANCIAL_PLANNING: {
    financial_liquidity: ["company_profile", "market_snapshot", "market_research", "supplier_list", "menu_cost", "real_estate", "business_plan", "personnel_plan", "constraints", "business_model"],
    financial_profitability: ["company_profile", "market_snapshot", "market_research", "industry_research", "constraints", "business_model"],
    financial_capital: ["company_profile", "real_estate", "business_plan", "personnel_plan", "market_research", "constraints", "business_model"],
    financial_break_even: ["company_profile", "market_snapshot", "market_research", "supplier_list", "menu_cost", "real_estate", "personnel_plan", "constraints", "business_model"],
    financial_monthly_h1: ["company_profile", "market_snapshot", "market_research", "supplier_list", "menu_cost", "real_estate", "business_plan", "personnel_plan", "kpi_estimation", "constraints", "business_model"],
    financial_monthly_h2: ["company_profile", "market_snapshot", "market_research", "supplier_list", "menu_cost", "real_estate", "business_plan", "personnel_plan", "kpi_estimation", "constraints", "business_model"],
  },
};

/** Whitelist: only include these fields per workflow. Unlisted workflows → DEFAULT_WORKFLOW_CONTEXT_KEYS (kein voller Kontext). */
const CONTEXT_WHITELIST: Record<string, (keyof ContextPack)[]> = {
  WF_BUSINESS_FORM: ["company_profile"],
  WF_BASELINE: [
    "company_profile",
    "constraints",
    "business_model",
    "kpi_set",
    "kpi_input_fields",
    "kpi_library_summary",
    "strategy_indicators",
    "indicator_mapping_rules",
    "kpi_snapshot",
    "data_quality",
    "industry_research",
    "baseline",
    "market_sources",
  ],
  WF_MARKET: ["company_profile", "industry_research", "constraints", "business_model", "market_sources", "related_analysis_outputs"],
  WF_RESEARCH: ["company_profile", "market_snapshot", "industry_research", "constraints", "business_model", "market_sources", "related_analysis_outputs"],
  WF_MENU_CARD: ["company_profile", "market_snapshot", "industry_research", "constraints", "business_model"],
  WF_SUPPLIER_LIST: ["company_profile", "market_snapshot", "industry_research", "menu_card", "constraints", "business_model"],
  WF_MENU_COST: ["company_profile", "menu_card", "supplier_list", "constraints", "business_model"],
  WF_MENU_PRICING: ["company_profile", "market_snapshot", "industry_research", "menu_card", "supplier_list", "menu_cost", "constraints", "business_model"],
  WF_REAL_ESTATE: ["company_profile", "market_snapshot", "industry_research", "constraints", "business_model"],
  WF_BUSINESS_PLAN: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "industry_research",
    "failure_analysis",
    "supplier_list",
    "menu_cost",
    "real_estate",
    "best_practices",
    "financial_planning",
    "personnel_plan",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_STARTUP_CONSULTING: ["company_profile", "industry_research", "startup_insights", "constraints", "business_model", "related_analysis_outputs"],
  WF_TECH_DIGITALIZATION: ["company_profile", "industry_research", "work_processes"],
  WF_AUTOMATION_ROI: ["company_profile", "work_processes", "industry_research"],
  WF_PHYSICAL_AUTOMATION: ["company_profile", "work_processes", "industry_research"],
  WF_INVENTORY_LAUNCH: ["company_profile", "work_processes", "industry_research", "market_snapshot", "related_analysis_outputs"],
  WF_APP_DEVELOPMENT: ["company_profile", "industry_research", "business_plan", "related_analysis_outputs"],
  WF_CUSTOMER_VALIDATION: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_PROCESS_OPTIMIZATION: [
    "company_profile",
    "kpi_snapshot",
    "industry_research",
    "baseline",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_STRATEGIC_OPTIONS: [
    "company_profile",
    "market_research",
    "industry_research",
    "business_plan",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_IDEA_USP_VALIDATION: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "industry_research",
    "baseline",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_FEASIBILITY_VALIDATION: [
    "company_profile",
    "market_research",
    "industry_research",
    "business_plan",
    "baseline",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_PATENT_CHECK: [
    "company_profile",
    "industry_research",
    "market_research",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_LEGAL_FOUNDATION: [
    "company_profile",
    "industry_research",
    "market_research",
    "business_plan",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_VALUE_PROPOSITION: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "industry_research",
    "baseline",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GO_TO_MARKET: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "business_plan",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_FINANCIAL_PLANNING: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "supplier_list",
    "menu_cost",
    "menu_card",
    "real_estate",
    "business_plan",
    "personnel_plan",
    "work_processes",
    "kpi_estimation",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_DIAGNOSTIC: ["company_profile", "baseline", "kpi_set", "kpi_snapshot", "industry_research", "constraints", "business_model", "related_analysis_outputs"],
  WF_NEXT_BEST_ACTIONS: [
    "company_profile",
    "market_research",
    "best_practices",
    "failure_analysis",
    "industry_research",
    "kpi_set",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_KPI_ESTIMATION: [
    "company_profile",
    "industry_research",
    "market_snapshot",
    "market_research",
    "baseline",
    "business_plan",
    "financial_planning",
    "constraints",
    "business_model",
    "kpi_snapshot",
    "kpi_set",
    "kpis_to_estimate",
    "kpi_library_summary",
    "benchmarks",
    "related_analysis_outputs",
  ],
  WF_DATA_COLLECTION_PLAN: ["company_profile", "kpi_set", "constraints", "business_model", "data_quality"],
  WF_SCENARIO_ANALYSIS: [
    "company_profile",
    "market_research",
    "industry_research",
    "baseline",
    "business_plan",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_OPERATIVE_PLAN: [
    "company_profile",
    "kpi_snapshot",
    "industry_research",
    "market_research",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_SWOT: ["company_profile", "market_snapshot", "industry_research", "constraints", "business_model", "related_analysis_outputs"],
  WF_COMPETITOR_ANALYSIS: ["company_profile", "market_snapshot", "industry_research", "constraints", "business_model", "related_analysis_outputs"],
  WF_TREND_ANALYSIS: ["company_profile", "market_snapshot", "industry_research", "constraints", "business_model", "related_analysis_outputs"],
  WF_STRATEGIC_PLANNING: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "industry_research",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_MARKETING_STRATEGY: [
    "company_profile",
    "kpi_snapshot",
    "market_research",
    "baseline",
    "decision_pack",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_SCALING_STRATEGY: [
    "company_profile",
    "kpi_snapshot",
    "market_research",
    "baseline",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GROWTH_MARGIN_OPTIMIZATION: [
    "company_profile",
    "kpi_snapshot",
    "market_research",
    "baseline",
    "business_plan",
    "financial_planning",
    "personnel_plan",
    "menu_cost",
    "supplier_list",
    "industry_research",
    "decision_pack",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GROWTH_BUSINESS_SUMMARY: [
    "company_profile",
    "baseline",
    "market_research",
    "decision_pack",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GROWTH_OFFER_AUDIENCE_FUNNEL: [
    "company_profile",
    "market_snapshot",
    "market_research",
    "decision_pack",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GROWTH_PAID_ADS: [
    "company_profile",
    "kpi_snapshot",
    "market_research",
    "market_snapshot",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GROWTH_SEO: [
    "company_profile",
    "market_research",
    "industry_research",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GROWTH_RETENTION_CONTENT: [
    "company_profile",
    "decision_pack",
    "kpi_snapshot",
    "market_research",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_GROWTH_EXECUTION_PLAN: [
    "company_profile",
    "kpi_snapshot",
    "kpi_set",
    "kpi_estimation",
    "decision_pack",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_SUBSIDY_RESEARCH: [
    "company_profile",
    "industry_research",
    "market_research",
    "financial_planning",
    "business_plan",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
  WF_PORTFOLIO_MANAGEMENT: [
    "company_profile",
    "kpi_snapshot",
    "industry_research",
    "constraints",
    "business_model",
    "related_analysis_outputs",
  ],
};

function filterContextForWorkflow(full: ContextPack, workflowKey: string): ContextPack {
  const allowed = CONTEXT_WHITELIST[workflowKey] ?? DEFAULT_WORKFLOW_CONTEXT_KEYS;

  const filtered = { ...full };
  const keys = Object.keys(full) as (keyof ContextPack)[];
  for (const key of keys) {
    if (!allowed.includes(key)) {
      const val = full[key];
      (filtered as Record<string, unknown>)[key] = Array.isArray(val) ? [] : null;
    }
  }
  return filtered;
}

export const ContextPackService = {
  async build(companyId: string, workflowKey: string): Promise<ContextPack> {
    const [
      company,
      latestProfile,
      latestKpiSet,
      kpiValues,
      benchmarks,
      sources,
      artifacts,
      activeKnowledgeVersion,
      kpiInputFields,
      kpiLibrary,
      strategyIndicators,
      indicatorRules,
    ] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.companyProfile.findFirst({
        where: { companyId },
        orderBy: { version: "desc" },
      }),
      prisma.companyKpiSet.findFirst({
        where: { companyId },
        orderBy: { version: "desc" },
      }),
      prisma.kpiValue.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
      prisma.benchmark.findMany({ where: { companyId } }),
      prisma.source.findMany({ where: { companyId } }),
      prisma.artifact.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
      prisma.knowledgeVersion
        .findFirst({ where: { status: "active" } })
        .catch((err: unknown) => {
          console.warn("[ContextPack] knowledgeVersion unavailable (DB schema, migrate, or connection):", err);
          return null;
        }),
      prisma.kpiInputField ? prisma.kpiInputField.findMany() : Promise.resolve([]),
      prisma.kpiLibrary ? prisma.kpiLibrary.findMany({ orderBy: { priorityWeight: "desc" } }) : Promise.resolve([]),
      prisma.strategyIndicator ? prisma.strategyIndicator.findMany() : Promise.resolve([]),
      prisma.indicatorMappingRule ? prisma.indicatorMappingRule.findMany() : Promise.resolve([]),
    ]);

    const industryResearchArtifact = artifacts.find((a) => a.type === "industry_research");
    const industry_research =
      industryResearchArtifact?.contentJson && typeof industryResearchArtifact.contentJson === "object"
        ? (industryResearchArtifact.contentJson as Record<string, unknown>)
        : null;

    const marketSnapshotArtifact = artifacts.find((a) => a.type === "market");
    const market_snapshot =
      marketSnapshotArtifact?.contentJson && typeof marketSnapshotArtifact.contentJson === "object"
        ? (marketSnapshotArtifact.contentJson as Record<string, unknown>)
        : null;

    const failureAnalysisArtifact = artifacts.find((a) => a.type === "failure_analysis");
    const failure_analysis =
      failureAnalysisArtifact?.contentJson && typeof failureAnalysisArtifact.contentJson === "object"
        ? (failureAnalysisArtifact.contentJson as Record<string, unknown>)
        : null;

    const bestPracticesArtifact = artifacts.find((a) => a.type === "best_practices");
    const best_practices =
      bestPracticesArtifact?.contentJson && typeof bestPracticesArtifact.contentJson === "object"
        ? (bestPracticesArtifact.contentJson as Record<string, unknown>)
        : null;

    const marketResearchArtifact = artifacts.find((a) => a.type === "market_research");
    const market_research =
      marketResearchArtifact?.contentJson && typeof marketResearchArtifact.contentJson === "object"
        ? (marketResearchArtifact.contentJson as Record<string, unknown>)
        : null;

    const supplierListArtifact = artifacts.find((a) => a.type === "supplier_list");
    const supplier_list =
      supplierListArtifact?.contentJson && typeof supplierListArtifact.contentJson === "object"
        ? (supplierListArtifact.contentJson as Record<string, unknown>)
        : null;

    const menuCardArtifact = artifacts.find((a) => a.type === "menu_card");
    const menu_card =
      menuCardArtifact?.contentJson && typeof menuCardArtifact.contentJson === "object"
        ? (menuCardArtifact.contentJson as Record<string, unknown>)
        : null;

    const menuCostArtifact = artifacts.find((a) => a.type === "menu_cost");
    const menu_cost =
      menuCostArtifact?.contentJson && typeof menuCostArtifact.contentJson === "object"
        ? (menuCostArtifact.contentJson as Record<string, unknown>)
        : null;

    const realEstateArtifact = artifacts.find((a) => a.type === "real_estate");
    const real_estate =
      realEstateArtifact?.contentJson && typeof realEstateArtifact.contentJson === "object"
        ? (realEstateArtifact.contentJson as Record<string, unknown>)
        : null;

    const baselineArtifact = artifacts.find((a) => a.type === "baseline");
    const baseline =
      baselineArtifact?.contentJson && typeof baselineArtifact.contentJson === "object"
        ? (baselineArtifact.contentJson as Record<string, unknown>)
        : null;

    const businessPlanArtifact = artifacts.find((a) => a.type === "business_plan");
    const business_plan =
      businessPlanArtifact?.contentJson && typeof businessPlanArtifact.contentJson === "object"
        ? (businessPlanArtifact.contentJson as Record<string, unknown>)
        : null;

    const financialPlanningArtifact = artifacts.find((a) => a.type === "financial_planning");
    const financial_planning =
      financialPlanningArtifact?.contentJson && typeof financialPlanningArtifact.contentJson === "object"
        ? (financialPlanningArtifact.contentJson as Record<string, unknown>)
        : null;

    const personnelPlanArtifact = artifacts.find((a) => a.type === "personnel_plan");
    const personnel_plan =
      personnelPlanArtifact?.contentJson && typeof personnelPlanArtifact.contentJson === "object"
        ? (personnelPlanArtifact.contentJson as Record<string, unknown>)
        : null;

    const kpiEstimationArtifact = artifacts.find((a) => a.type === "kpi_estimation");
    const kpi_estimation =
      kpiEstimationArtifact?.contentJson && typeof kpiEstimationArtifact.contentJson === "object"
        ? (kpiEstimationArtifact.contentJson as Record<string, unknown>)
        : null;

    const workProcessesArtifact = artifacts.find((a) => a.type === "work_processes");
    const work_processes =
      workProcessesArtifact?.contentJson && typeof workProcessesArtifact.contentJson === "object"
        ? (workProcessesArtifact.contentJson as Record<string, unknown>)
        : null;

    const decisionPackArtifact = artifacts.find((a) => a.type === "decision_pack");
    const decision_pack =
      decisionPackArtifact?.contentJson && typeof decisionPackArtifact.contentJson === "object"
        ? (decisionPackArtifact.contentJson as Record<string, unknown>)
        : null;

    let company_profile: Record<string, unknown> | null = (latestProfile?.profileJson && typeof latestProfile.profileJson === "object") ? (latestProfile.profileJson as Record<string, unknown>) : null;
    if (company_profile && menu_card) {
      const mf = menu_card.menu_full as { items?: Array<{ name?: string; category?: string; description?: string; price?: string }> } | undefined;
      const mi = menu_card.menu_intro as { items?: Array<{ name?: string; description?: string; price?: string }> } | undefined;
      const items = mf?.items ?? mi?.items ?? [];
      if (items.length > 0) {
        const products = items.map((i) => ({ name: i.name ?? "", description: i.description, category: (mf?.items ? (i as { category?: string }).category : undefined), price: i.price }));
        const offerText = items.map((i) => i.name ?? "").filter(Boolean).join(", ");
        company_profile = { ...company_profile, products, offer: offerText || (company_profile.offer as string) };
      }
    }

    const retrieval = buildRelatedAnalysisRetrieval(artifacts as Array<{ type: string; title: string; contentJson: unknown; createdAt: Date }>, workflowKey);

    const fullContext: ContextPack = {
      startup_insights: startupInsights as unknown as Record<string, unknown>,
      company_profile,
      industry_research,
      market_snapshot,
      failure_analysis,
      best_practices,
      market_research,
      supplier_list,
      menu_card,
      menu_cost,
      real_estate,
      baseline,
      business_plan,
      financial_planning,
      personnel_plan,
      work_processes,
      kpi_estimation,
      business_model: {
        type: company?.inferredBusinessModelType ?? null,
        confidence: company?.inferredConfidence ?? null,
        stage: company?.stageGuess ?? null,
        stage_confidence: company?.stageConfidence ?? null,
      },
      constraints: (latestProfile?.profileJson && typeof latestProfile.profileJson === "object")
        ? {
            constraints: (latestProfile.profileJson as Record<string, unknown>).constraints,
            stage: (latestProfile.profileJson as Record<string, unknown>).stage,
            team_size: (latestProfile.profileJson as Record<string, unknown>).team_size,
          } as Record<string, unknown>
        : {},
      kpi_set: latestKpiSet
        ? {
            kpis: latestKpiSet.selectedKpisJson,
            kpi_tree: latestKpiSet.kpiTreeJson,
            rationale: latestKpiSet.rationaleJson,
          }
        : null,
      kpis_to_estimate: await (async () => {
        const fromSet = latestKpiSet?.selectedKpisJson as string[] | null;
        if (fromSet && Array.isArray(fromSet) && fromSet.length > 0) return fromSet;
        const r = await AutoKpiService.selectKpiSet(
          companyId,
          company?.inferredBusinessModelType ?? "mixed"
        );
        return r.selected_kpis;
      })(),
      kpi_input_fields: kpiInputFields.map((f) => ({
        key: f.key,
        label_simple: f.labelSimple,
        unit: f.unit,
        description: f.description,
      })),
      kpi_library_summary: kpiLibrary.map((k) => ({
        kpi_key: k.kpiKey,
        name_simple: k.nameSimple,
        name_advanced: k.nameAdvanced,
        category: k.domain,
        formula_text: k.formulaText,
        proxy_formula_text: k.proxyFormulaText,
        required_inputs: k.requiredInputsJson,
        decision_weight: k.decisionWeight,
        default_targets_by_stage: k.defaultTargetsByStageJson,
        guardrails: k.defaultGuardrailsJson,
        why_for_decisions: k.whyForDecisions,
      })),
      strategy_indicators: strategyIndicators.map((i) => ({
        indicator_key: i.indicatorKey,
        name_simple: i.nameSimple,
        framework_origin: i.frameworkOrigin,
        scale: i.scale,
        definition: i.definition,
        why_for_decisions: i.whyForDecisions,
      })),
      indicator_mapping_rules: indicatorRules.map((r) => ({
        rule_key: r.ruleKey,
        condition: r.conditionExpression,
        actions: r.actionsJson,
      })),
      kpi_snapshot: kpiValues.map((value) => ({
        kpi_key: value.kpiKey,
        value: value.value,
        period_start: value.periodStart,
        period_end: value.periodEnd,
        confidence: value.confidence,
        source_ref: value.sourceRefJson,
      })),
      targets: [],
      benchmarks: benchmarks.map((benchmark) => ({
        kpi_key: benchmark.kpiKey,
        low: benchmark.valueLow,
        mid: benchmark.valueMid,
        high: benchmark.valueHigh,
        segment: benchmark.segmentJson,
        confidence: benchmark.confidence,
        source_id: benchmark.sourceId,
        knowledge_object_id: benchmark.knowledgeObjectId,
      })),
      market_sources: sources.map((source) => ({
        source_id: source.id,
        title: source.title,
        url: source.url,
        date: source.date,
        key_points: source.keyPointsJson,
      })),
      artifacts_summary: [],
      related_analysis_outputs: retrieval.outputs,
      knowledge_retrieval: {
        kb_version_active: activeKnowledgeVersion?.versionLabel ?? null,
        retrieved_objects: retrieval.retrievedObjects,
        contradictions: [],
      },
      data_quality: {
        missing_inputs: latestKpiSet
          ? ((latestKpiSet.rationaleJson as Record<string, unknown>)?.missing_inputs as string[]) ?? []
          : [],
        alerts: [],
        confidence_overview: kpiValues.length > 0
          ? { avg_confidence: kpiValues.reduce((a, v) => a + v.confidence, 0) / kpiValues.length }
          : {},
      },
      decision_pack,
    };

    return filterContextForWorkflow(fullContext, workflowKey);
  },
};

const FINANCIAL_MINIMAL_STEPS = ["financial_liquidity", "financial_profitability", "financial_capital", "financial_break_even", "financial_monthly_h1", "financial_monthly_h2"] as const;

const MAX_STRING = 500;
const MAX_ARRAY_DEFAULT = 12;
const MAX_ARRAY_MENU = 40;
const MAX_ARRAY_SUPPLIERS = 30;
const MAX_ARRAY_COMPONENTS = 25;

/** Filter context for a specific step. For WF_FINANCIAL_PLANNING sub-steps: minimal flat extract. For ALL others: minimalize to reduce tokens. */
export function filterContextForStep(
  context: Record<string, unknown>,
  workflowKey: string,
  stepKey: string
): Record<string, unknown> {
  if (workflowKey === "WF_FINANCIAL_PLANNING" && (FINANCIAL_MINIMAL_STEPS as readonly string[]).includes(stepKey)) {
    return buildMinimalContextForFinancialStep(context, stepKey);
  }
  const stepWhitelist = CONTEXT_WHITELIST_STEP[workflowKey]?.[stepKey];
  let base: Record<string, unknown>;
  if (stepWhitelist) {
    base = {};
    for (const key of stepWhitelist) {
      const val = context[key];
      if (val !== undefined) base[key] = val;
    }
  } else {
    base = { ...context };
  }
  return minimalizeContext(base);
}

/** Minimalize context for all workflows: limit array lengths, truncate long strings. Reduces token usage across the app. */
function minimalizeContext(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    const minimal = minimalizeValue(k, v);
    if (minimal !== null && minimal !== undefined) {
      if (Array.isArray(minimal) && minimal.length === 0) continue;
      if (typeof minimal === "object" && !Array.isArray(minimal) && Object.keys(minimal as object).length === 0) continue;
      out[k] = minimal;
    }
  }
  return stripEmptyFields(out);
}

function minimalizeValue(key: string, val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "number" || typeof val === "boolean") return val;
  if (typeof val === "string") {
    const maxLen = key === "content" ? 12000 : MAX_STRING;
    return val.length > maxLen ? val.slice(0, maxLen - 3) + "..." : val;
  }
  if (Array.isArray(val)) {
    const maxLen =
      key === "items" ? MAX_ARRAY_MENU
      : key === "suppliers" ? MAX_ARRAY_SUPPLIERS
      : key === "components" ? MAX_ARRAY_COMPONENTS
      : MAX_ARRAY_DEFAULT;
    const arr = val.slice(0, maxLen).map((v) => minimalizeValue("", v));
    return arr;
  }
  if (typeof val === "object" && val !== null) {
    const rec = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec)) {
      const minimal = minimalizeValue(k, v);
      if (minimal !== null && minimal !== undefined) {
        if (Array.isArray(minimal) && minimal.length === 0) continue;
        if (typeof minimal === "object" && !Array.isArray(minimal) && Object.keys(minimal as object).length === 0) continue;
        out[k] = minimal;
      }
    }
    return out;
  }
  return val;
}

/** Kompakte Inventar-/Equipment-Daten aus related_analysis_outputs (WF Inventar & Equipment). */
function extractInventoryEquipmentForCapital(
  related: ContextPack["related_analysis_outputs"] | undefined
): Record<string, unknown> | null {
  if (!related?.length) return null;
  const row = related.find((r) => r.artifact_type === "inventory_equipment_plan");
  if (!row?.content || typeof row.content !== "object" || Array.isArray(row.content)) return null;
  const c = row.content as Record<string, unknown>;
  const baseline = c.inventory_baseline as Record<string, unknown> | undefined;
  const market = c.market_entry_equipment as Record<string, unknown> | undefined;
  const scaling = c.equipment_scaling_roadmap as Record<string, unknown> | undefined;
  return {
    legal_form: baseline?.legal_form ?? null,
    inventory_context: baseline?.inventory_context ?? null,
    equipment_lines: baseline?.equipment ?? null,
    materials_lines: baseline?.materials ?? null,
    market_entry_budget_hint: market?.total_budget_eur_band_hint ?? null,
    market_entry_must_have: market?.market_entry_must_have ?? null,
    nice_to_have: market?.nice_to_have ?? null,
    efficiency_upgrades: scaling?.efficiency_upgrades ?? null,
    scaling_notes: scaling?.scaling_phase_notes ?? null,
  };
}

/** Minimal flat context for financial steps – only hard numbers, no narratives. Single source per datum. */
function buildMinimalContextForFinancialStep(context: Record<string, unknown>, stepKey: string): Record<string, unknown> {
  const profile = context.company_profile as Record<string, unknown> | null | undefined;
  const realEstate = context.real_estate as Record<string, unknown> | null | undefined;
  const personnel = context.personnel_plan as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null | undefined;
  const financial = context.financial_planning as { monthly_projection?: unknown[] } | null | undefined;
  const businessPlan = context.business_plan as { monthly_projection?: unknown[] } | null | undefined;
  const menuCost = context.menu_cost as { summary?: string; total_warenkosten?: number } | null | undefined;
  const constraints = context.constraints as Record<string, unknown> | null | undefined;
  const businessModel = context.business_model as { stage?: string; type?: string } | null | undefined;
  const kpiEst = context.kpi_estimation as { kpi_estimates?: Array<{ kpi_key?: string; value_month_1?: number; value_month_12?: number }> } | null | undefined;
  const related = context.related_analysis_outputs as ContextPack["related_analysis_outputs"] | undefined;

  const monthlyProj = financial?.monthly_projection ?? businessPlan?.monthly_projection ?? null;
  const realEstatePriceRanges = extractPriceRangesFromRealEstate(realEstate);

  const out: Record<string, unknown> = {
    stage: businessModel?.stage ?? profile?.stage ?? null,
    industry: profile?.industry ?? profile?.company_name ?? null,
    location: profile?.location ?? null,
    constraints: constraints?.constraints ?? constraints ?? null,
    real_estate_price_ranges: realEstatePriceRanges,
    monthly_personnel_costs: personnel?.monthly_personnel_costs ?? null,
    monthly_projection: monthlyProj,
  };
  if (menuCost?.summary || menuCost?.total_warenkosten != null) {
    out.menu_cost_summary = menuCost.summary ?? `total_warenkosten: ${menuCost.total_warenkosten}`;
  }
  if (stepKey === "financial_capital") {
    const inv = extractInventoryEquipmentForCapital(related);
    if (inv && Object.keys(inv).length > 0) {
      out.inventory_equipment_investment_inputs = inv;
    }
  }
  if (stepKey === "financial_monthly_h1" || stepKey === "financial_monthly_h2") {
    const estimates = kpiEst?.kpi_estimates ?? [];
    const m1 = estimates.find((e) => e.kpi_key === "north_star_revenue" || e.kpi_key === "revenue")?.value_month_1;
    const m12 = estimates.find((e) => e.kpi_key === "north_star_revenue" || e.kpi_key === "revenue")?.value_month_12;
    if (m1 != null) out.value_month_1 = m1;
    if (m12 != null) out.value_month_12 = m12;
  }
  return stripEmptyFields(out);
}

/** Extract price_range strings from real_estate options. LLM computes average (Miete) or estimates. No server-side parsing. */
function extractPriceRangesFromRealEstate(realEstate: Record<string, unknown> | null | undefined): string[] | null {
  if (!realEstate || typeof realEstate !== "object") return null;
  const opts = realEstate.options as Array<{ price_range?: string }> | undefined;
  if (!opts?.length) return null;
  const ranges = opts.map((o) => o?.price_range).filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  return ranges.length > 0 ? ranges : null;
}

/** Remove null and empty arrays from object to reduce token count. Keeps arrays as-is (no recursion into elements). */
function stripEmptyFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const cleaned = stripEmptyFields(v as Record<string, unknown>);
      if (Object.keys(cleaned).length > 0) out[k] = cleaned;
    } else {
      out[k] = v;
    }
  }
  return out;
}
