import Link from "next/link";
import Script from "next/script";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createRunWorkflowAction } from "@/app/actions";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { WORKFLOWS, WORKFLOW_BY_KEY } from "@/lib/workflows";
import { PLANNING_PHASES, PLANNING_AREAS, WIZARD_WORKFLOW_ORDER, WORKFLOW_STEP_LABELS, WORKFLOW_TO_ARTIFACTS, ARTIFACT_LABELS } from "@/lib/planningFramework";
import { workflowSteps as WORKFLOW_STEP_DEFS } from "@/lib/workflowSteps";
import { RunAllQuickActions } from "@/components/RunAllQuickActions";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { WorkflowService } from "@/services/workflows";
import { getPlanningPhaseReleasedMap } from "@/lib/planningPhaseRelease";
import { PhaseArtifactsReleaseBlock } from "@/components/PhaseArtifactsReleaseBlock";
import { PhaseRunButtonForm } from "@/components/PhaseRunButtonForm";
import { getStudyCategoryContext, type StudyCategoryKey } from "@/lib/studyCategoryContext";
import { unlockAllWorkflowsFromEnv } from "@/lib/workflowUnlock";

function getWorkflowArtifactLabel(workflowKey: string, artifactType: string, locale: "de" | "en") {
  if (workflowKey === "WF_IDEA_USP_VALIDATION" && artifactType === "value_proposition") {
    return locale === "de" ? "Idee- & USP-Validierung" : "Idea & USP validation";
  }
  if (workflowKey === "WF_PATENT_CHECK" && artifactType === "strategic_options") {
    return locale === "de" ? "Patentrecht & Schutzfähigkeit" : "Patents & protectability";
  }
  if (workflowKey === "WF_LEGAL_FOUNDATION" && artifactType === "startup_guide") {
    return locale === "de" ? "Rechtliche Vorgaben & Unternehmensform" : "Legal requirements & legal form";
  }
  return ARTIFACT_LABELS[artifactType] ?? artifactType;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ assistant_phase?: string; run_error?: string; run_success?: string; view?: string; phase?: string }>;
}) {
  const params = await searchParams;
  const hdrs = await headers();
  const isEmbedFrame = hdrs.get("x-app-embed") === "1";
  const assistantPhaseId = String(params.assistant_phase ?? "").trim();
  const selectedOverviewPhaseId = String(params.phase ?? "").trim();
  const activeView = assistantPhaseId ? "execution" : (params.view === "execution" ? "execution" : "overview");
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const isDe = locale === "de";
  const phaseNamesEn: Record<string, string> = {
    ideation: "Ideation / Concept Phase",
    validation: "Validation Phase",
    launch: "Founding / Launch Phase",
    scaling: "Growth Phase",
    tech_digital: "Technology & Digitalization",
    maturity: "Strategy Phase",
    renewal: "Strategic Options / Exit / Transformation",
  };
  const phaseGoalsEn: Record<string, string> = {
    ideation: "Validate whether a business idea is fundamentally viable.",
    validation: "Prove that customers would actually buy.",
    launch: "Officially launch the company and generate first revenues.",
    scaling: "Increase revenue and gain market share.",
    tech_digital: "Identify suitable technology tools and automation options.",
    maturity: "Optimize profitability, efficiency, and operational resilience.",
    renewal: "Evaluate strategic options for value growth, legal setup changes, expansion, or exit.",
  };
  const phaseInstrumentsEn: Record<string, string[]> = {
    ideation: ["Problem-solution fit", "Market analysis", "Trend analysis", "Competitor analysis", "SWOT analysis", "Target-group analysis", "Value proposition design"],
    validation: ["Problem-solution fit", "USP check", "Feasibility check", "Patent research", "Legal form & legal setup", "MVP", "Customer interviews", "Landing page tests", "Pilot customers", "Prototypes"],
    launch: ["Business plan", "Financial planning", "Legal form", "Pricing strategy", "Go-to-market strategy", "Marketing strategy", "Sales channels"],
    scaling: ["Business model scaling", "Automation", "Team building", "Marketing scale-up", "Sales systems"],
    tech_digital: ["POS system", "Document archiving", "Accounting", "RPA", "Physical automation", "Own app"],
    maturity: ["Root-cause analysis", "Margin and cost optimization", "Scaling readiness", "Process optimization", "Technology and digitalization", "Automation and app implementation", "Portfolio strategy", "Subsidies and funding programs"],
    renewal: ["Company valuation estimate", "Exit channels & platforms", "M&A", "IPO", "Legal form change", "Expansion", "Succession planning"],
  };
  const workflowNamesEn: Record<string, string> = {
    WF_BASELINE: "Baseline analysis",
    WF_MARKET: "Market snapshot",
    WF_RESEARCH: "Market & best-practice analysis",
    WF_VALUE_PROPOSITION: "Value proposition",
    WF_COMPETITOR_ANALYSIS: "Competitor analysis",
    WF_SWOT: "SWOT analysis",
    WF_TREND_ANALYSIS: "Trend analysis",
    WF_CUSTOMER_VALIDATION: "Customer validation",
    WF_BUSINESS_PLAN: "Business plan",
    WF_GO_TO_MARKET: "Go-to-market & pricing",
    WF_LEGAL_FOUNDATION: "Legal setup & legal form",
    WF_MARKETING_STRATEGY: "Marketing strategy",
    WF_FINANCIAL_PLANNING: "Financial planning",
    WF_DIAGNOSTIC: "Root-cause analysis",
    WF_NEXT_BEST_ACTIONS: "Top decisions",
    WF_SCALING_STRATEGY: "Scaling strategy",
    WF_GROWTH_MARGIN_OPTIMIZATION: "Margin, offer & cost optimization",
    WF_GROWTH_BUSINESS_SUMMARY: "Growth business summary",
    WF_GROWTH_OFFER_AUDIENCE_FUNNEL: "Offer, audience & funnel",
    WF_GROWTH_PAID_ADS: "Meta & Google Ads",
    WF_GROWTH_SEO: "SEO analysis",
    WF_GROWTH_RETENTION_CONTENT: "Retention, content & UGC",
    WF_GROWTH_EXECUTION_PLAN: "KPI & 30/60/90 execution",
    WF_PROCESS_OPTIMIZATION: "Process optimization",
    WF_PORTFOLIO_MANAGEMENT: "Portfolio management",
    WF_SUBSIDY_RESEARCH: "Subsidies & funding programs",
    WF_STRATEGIC_OPTIONS: "Strategic options",
    WF_KPI_ESTIMATION: "KPI estimation",
    WF_DATA_COLLECTION_PLAN: "Data collection plan",
    WF_SCENARIO_ANALYSIS: "Scenario & risk analysis",
    WF_OPERATIVE_PLAN: "Operational plan",
    WF_STRATEGIC_PLANNING: "Strategic planning",
    WF_TECH_DIGITALIZATION: "Technology & digitalization",
    WF_AUTOMATION_ROI: "Computer automation & ROI",
    WF_PHYSICAL_AUTOMATION: "Physical automation",
    WF_INVENTORY_LAUNCH: "Inventory & equipment (market entry)",
    WF_APP_DEVELOPMENT: "App development",
    WF_STARTUP_CONSULTING: "Startup consulting",
    WF_BUSINESS_FORM: "Company profile",
    WF_MENU_CARD: "Offer catalog",
    WF_SUPPLIER_LIST: "Supplier list",
    WF_MENU_COST: "Cost structure",
    WF_MENU_PRICING: "Pricing calculation",
    WF_REAL_ESTATE: "Location options",
  };
  const workflowStepLabelsEn: Record<string, string[]> = {
    WF_BUSINESS_FORM: ["Company profile form"],
    WF_BASELINE: ["Business model", "KPI set", "Industry analysis"],
    WF_MARKET: ["Market snapshot"],
    WF_RESEARCH: ["Market research", "Best practices", "Why companies fail"],
    WF_MENU_CARD: ["Offer catalog (intro + complete)"],
    WF_SUPPLIER_LIST: ["Supplier list"],
    WF_MENU_COST: ["Cost of goods"],
    WF_MENU_PRICING: ["Offer", "Suppliers", "Cost of goods", "Price calculation"],
    WF_REAL_ESTATE: ["Location options"],
    WF_DIAGNOSTIC: ["Root-cause trees"],
    WF_NEXT_BEST_ACTIONS: ["Decision logic"],
    WF_BUSINESS_PLAN: ["Executive summary", "Market analysis", "Marketing strategy", "Financial scenarios", "Risk analysis"],
    WF_KPI_ESTIMATION: ["KPI estimation"],
    WF_DATA_COLLECTION_PLAN: ["Data collection plan"],
    WF_STARTUP_CONSULTING: ["Funding"],
    WF_CUSTOMER_VALIDATION: ["MVP", "Customer interviews", "Landing page tests", "Pilot customers", "Prototypes"],
    WF_STRATEGIC_OPTIONS: ["Valuation estimate", "Exit channels/platforms", "Legal form change", "Expansion", "M&A", "IPO", "Succession planning"],
    WF_VALUE_PROPOSITION: ["Value proposition & problem-solution fit"],
    WF_GO_TO_MARKET: ["Go-to-market & pricing"],
    WF_MARKETING_STRATEGY: ["Marketing strategy"],
    WF_SCALING_STRATEGY: ["Scalability", "Automation", "Marketing scale-up", "Sales systems"],
    WF_GROWTH_MARGIN_OPTIMIZATION: ["Contribution margin", "Offer & packaging logic", "Marketing & ROI levers", "Costs, people, procurement & energy"],
    WF_GROWTH_BUSINESS_SUMMARY: ["Business model", "Target market", "Growth levers"],
    WF_GROWTH_OFFER_AUDIENCE_FUNNEL: ["Offer positioning", "Audience personas", "Funnel priorities"],
    WF_GROWTH_PAID_ADS: ["Readiness score", "Meta campaign priorities", "Google campaign priorities"],
    WF_GROWTH_SEO: ["Technical SEO", "On-page SEO", "Keyword clusters"],
    WF_GROWTH_RETENTION_CONTENT: ["Email/SMS retention", "Content pillars", "UGC creative matrix"],
    WF_GROWTH_EXECUTION_PLAN: ["KPI framework", "30/60/90 plan", "Draft artifacts"],
    WF_PROCESS_OPTIMIZATION: ["Process optimization", "Cost management", "Brand strategy", "Internationalization"],
    WF_PORTFOLIO_MANAGEMENT: ["Optimize product portfolio", "Expand market segments", "Strategic partnerships"],
    WF_SUBSIDY_RESEARCH: ["Program fit", "Eligibility criteria", "Application process"],
    WF_SCENARIO_ANALYSIS: ["Scenario & risk analysis"],
    WF_OPERATIVE_PLAN: ["Operational plan"],
    WF_COMPETITOR_ANALYSIS: ["Competitor analysis"],
    WF_SWOT: ["SWOT analysis"],
    WF_FINANCIAL_PLANNING: ["Work processes (planning -> end customer)", "Personnel plan & personnel costs", "Liquidity plan", "Profitability plan", "Capital requirements", "Break-even"],
    WF_IDEA_USP_VALIDATION: ["Idea and USP check"],
    WF_FEASIBILITY_VALIDATION: ["Feasibility & prerequisites"],
    WF_PATENT_CHECK: ["Patentability & source review"],
    WF_LEGAL_FOUNDATION: ["Legal framework & legal form"],
    WF_STRATEGIC_PLANNING: ["Strategic planning"],
    WF_TREND_ANALYSIS: ["Trend analysis", "PESTEL analysis"],
    WF_TECH_DIGITALIZATION: ["POS system", "Document archiving", "Accounting", "CRM", "Additional tools"],
    WF_AUTOMATION_ROI: ["Automatable processes", "Cost & ROI"],
    WF_PHYSICAL_AUTOMATION: ["Dough machine", "Thermomix", "Conveyor systems", "Cost & ROI"],
    WF_INVENTORY_LAUNCH: ["Inventory & legal form", "Processes & stock", "Market entry: gaps", "Efficiency & scale-up"],
    WF_APP_DEVELOPMENT: ["Ideas", "Project plan", "Requirements", "Tech spec", "MVP guide", "Page spec", "DB schema"],
  };
  const company = await getOrCreateDemoCompany();
  // Performance: Nur noch genau die Felder ziehen, die das Dashboard tatsächlich rendert.
  // Früher: `include: { steps: true }` lud ALLE RunStep-Felder (promptRendered,
  // userPastedResponse, parsedOutputJson, …) für sämtliche Runs — das waren pro
  // Phasenwechsel mehrere MB aus der DB und war der Hauptgrund für 10-15 s Renderzeit.
  // Wir verwenden zusätzlich `_count` auf Artefakte, um den Backfill-Loop unten auf
  // exakt die Läufe einzuschränken, bei denen wirklich noch Dokumente fehlen.
  let [
    artifacts,
    decisions,
    runs,
    profile,
    baselineArtifact,
    kpiSet,
    recentRuns,
    phaseReleasedMap,
  ] = await Promise.all([
    prisma.artifact.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.decision.findMany({ where: { companyId: company.id } }),
    prisma.run.findMany({
      where: { companyId: company.id },
      select: {
        id: true,
        workflowKey: true,
        status: true,
        createdAt: true,
        _count: { select: { artifacts: true } },
        // Wir brauchen die Step-Validierung, um Workflows nur dann als
        // "Abgeschlossen" zu markieren, wenn wirklich ALLE erwarteten Steps
        // erfolgreich validiert wurden (siehe `workflowHasAllStepsValidated`).
        steps: { select: { stepKey: true, schemaValidationPassed: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.companyProfile.findFirst({ where: { companyId: company.id }, orderBy: { version: "desc" } }),
    prisma.artifact.findFirst({ where: { companyId: company.id, type: "baseline" } }),
    prisma.companyKpiSet.findFirst({ where: { companyId: company.id }, orderBy: { version: "desc" } }),
    prisma.run.findMany({
      where: { companyId: company.id },
      include: { _count: { select: { steps: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getPlanningPhaseReleasedMap(company.id),
  ]);

  // Fehlende Dokumente aus vorhandenen (abgeschlossenen) Läufen nachziehen.
  // Grund: In Altbeständen kann Step-Output existieren, aber Artefakte fehlen noch.
  // Optimierung: Nur Runs ohne angehängtes Artefakt prüfen — vorher liefen hier
  // n sequentielle `findUnique(..., { include: { steps, artifacts } })` bei JEDEM
  // Phasenwechsel, selbst wenn längst nichts mehr nachzuziehen war.
  const runsNeedingArtifactBackfill = runs.filter(
    (r) => (r.status === "complete" || r.status === "approved") && (r._count?.artifacts ?? 0) === 0,
  );
  let anyCreated = false;
  if (runsNeedingArtifactBackfill.length > 0) {
    const results = await Promise.all(
      runsNeedingArtifactBackfill.map(async (runToFix) => {
        try {
          const { created } = await WorkflowService.createMissingArtifactsForRun(runToFix.id);
          return created.length > 0;
        } catch (err) {
          console.warn("[Dashboard] createMissingArtifactsForRun failed:", err);
          return false;
        }
      }),
    );
    anyCreated = results.some(Boolean);
  }
  if (anyCreated) {
    artifacts = await prisma.artifact.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    });
  }

  const runsByWorkflow = Object.fromEntries(
    WIZARD_WORKFLOW_ORDER.map((key) => [
      key,
      runs.filter((r) => r.workflowKey === key).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ])
  );
  function latestRunForWorkflow(workflowKey: string) {
    const list = runsByWorkflow[workflowKey] ?? [];
    return list[0];
  }
  function latestCompletedRunForWorkflow(workflowKey: string) {
    const list = runsByWorkflow[workflowKey] ?? [];
    return list.find((r) => r.status === "complete" || r.status === "approved");
  }
  function latestRunIsComplete(workflowKey: string) {
    const latest = latestRunForWorkflow(workflowKey);
    return Boolean(latest && (latest.status === "complete" || latest.status === "approved"));
  }
  function latestRunIsInProgress(workflowKey: string) {
    const latest = latestRunForWorkflow(workflowKey);
    return Boolean(latest && ["draft", "running", "incomplete"].includes(latest.status));
  }
  const workflowKeyByRunId = new Map<string, string>();
  for (const run of runs) {
    workflowKeyByRunId.set(run.id, run.workflowKey);
  }
  function findArtifactForWorkflowType(workflowKey: string, artifactType: string) {
    const workflowRunIds = new Set((runsByWorkflow[workflowKey] ?? []).map((run) => run.id));
    if (workflowKey === "WF_TREND_ANALYSIS") {
      if (artifactType === "trend_analysis") {
        const trendOnly = artifacts.find(
          (a) =>
            a.type === "trend_analysis" &&
            a.runId &&
            workflowRunIds.has(a.runId) &&
            !/pestel/i.test(a.title ?? "")
        );
        if (trendOnly) return trendOnly;
      }
      if (artifactType === "pestel_analysis") {
        const nativePestel = artifacts.find(
          (a) => a.type === "pestel_analysis" && a.runId && workflowRunIds.has(a.runId)
        );
        if (nativePestel) return nativePestel;
        // Compatibility: older PESTEL outputs can be stored as trend_analysis with "PESTEL" in title.
        const pestelFallback = artifacts.find(
          (a) =>
            a.type === "trend_analysis" &&
            a.runId &&
            workflowRunIds.has(a.runId) &&
            /pestel/i.test(a.title ?? "")
        );
        if (pestelFallback) return pestelFallback;
      }
    }
    const scoped = artifacts.find(
      (a) => a.type === artifactType && a.runId && workflowRunIds.has(a.runId)
    );
    if (scoped) return scoped;
    return null;
  }
  function workflowHasPersistedOutput(workflowKey: string) {
    if (workflowKey === "WF_BUSINESS_FORM") return hasProfile;
    const wfArtifactTypes = WORKFLOW_TO_ARTIFACTS[workflowKey] ?? [];
    return wfArtifactTypes.some((artifactType) => Boolean(findArtifactForWorkflowType(workflowKey, artifactType)));
  }
  /**
   * Strenge Completeness-Prüfung pro Workflow.
   *
   * Hintergrund: Bisher galt ein Workflow als "Abgeschlossen", sobald auch nur
   * EIN Artefakt existierte (`workflowHasPersistedOutput`). Dadurch wurden
   * z. B. `WF_BASELINE` oder `WF_MARKET` schon grün angezeigt, wenn nur der
   * erste Step ein Artefakt geschrieben hatte – obwohl weitere Pflicht-Steps
   * (KPI-Set, Branchenanalyse, …) noch offen waren.
   *
   * Neue Regel: Ein Workflow ist nur dann "komplett", wenn es für JEDEN
   * definierten `stepKey` aus `workflowSteps[workflowKey]` mindestens einen
   * RunStep (über beliebige Runs dieses Workflows hinweg) mit
   * `schemaValidationPassed === true` gibt. Fallback für Workflows ohne
   * Step-Definition: Artefakt-Existenz wie bisher.
   */
  function workflowHasAllStepsValidated(workflowKey: string): boolean {
    if (workflowKey === "WF_BUSINESS_FORM") return hasProfile;
    const expectedSteps = WORKFLOW_STEP_DEFS[workflowKey];
    if (!expectedSteps || expectedSteps.length === 0) {
      return workflowHasPersistedOutput(workflowKey);
    }
    const runsForWf = runsByWorkflow[workflowKey] ?? [];
    if (runsForWf.length === 0) return false;
    const validatedKeys = new Set<string>();
    for (const r of runsForWf) {
      for (const s of r.steps ?? []) {
        if (s.schemaValidationPassed === true) validatedKeys.add(s.stepKey);
      }
    }
    return expectedSteps.every((def) => validatedKeys.has(def.stepKey));
  }
  function collectPhaseArtifacts(phase: (typeof PLANNING_PHASES)[number]) {
    const result: Array<{ workflowKey: string; artifactType: string; artifact: (typeof artifacts)[number] }> = [];
    for (const workflowKey of phase.workflowKeys) {
      if (workflowKey === "WF_BUSINESS_FORM") continue;
      const wfArtifactTypes = WORKFLOW_TO_ARTIFACTS[workflowKey] ?? [];
      for (const artifactType of wfArtifactTypes) {
        const artifact = findArtifactForWorkflowType(workflowKey, artifactType);
        if (!artifact) continue;
        result.push({ workflowKey, artifactType, artifact });
      }
    }
    return result;
  }
  function artifactChipLabel(workflowKey: string, type: string, artifact: (typeof artifacts)[number]) {
    if (workflowKey === "WF_IDEA_USP_VALIDATION" && type === "value_proposition") {
      return getWorkflowArtifactLabel(workflowKey, type, locale);
    }
    if (workflowKey === "WF_PATENT_CHECK" && type === "strategic_options") {
      return getWorkflowArtifactLabel(workflowKey, type, locale);
    }
    if (workflowKey === "WF_LEGAL_FOUNDATION" && type === "startup_guide") {
      return getWorkflowArtifactLabel(workflowKey, type, locale);
    }
    return artifact.title || getWorkflowArtifactLabel(workflowKey ?? "", type, locale);
  }
  const hasBaseline = !!baselineArtifact;
  const hasKpiSet = !!kpiSet;
  const hasProfile = !!profile && (profile.completenessScore ?? 0) >= 0.5;
  const hasMarketSnapshot = artifacts.some((a) => a.type === "market");
  const hasFailureAnalysis = artifacts.some((a) => a.type === "failure_analysis");
  const hasSupplierList = artifacts.some((a) => a.type === "supplier_list");
  const hasMenuCard = artifacts.some((a) => a.type === "menu_card");
  const hasRealEstate = artifacts.some((a) => a.type === "real_estate");
  const hasResearch = artifacts.some((a) => a.type === "market_research") && hasFailureAnalysis;
  const hasBusinessPlan = artifacts.some((a) => a.type === "business_plan");
  const hasScalingStrategy = artifacts.some((a) => a.type === "scaling_strategy");
  const hasBusinessPlanPrereqs = hasBaseline && hasFailureAnalysis && hasSupplierList && hasRealEstate;
  const isLocked: Record<string, boolean> = {
    WF_BUSINESS_FORM: false,
    WF_BASELINE: !hasProfile,
    WF_MARKET: !hasBaseline,
    WF_RESEARCH: !hasBaseline || !hasMarketSnapshot,
    WF_MENU_CARD: !hasBaseline || !hasMarketSnapshot,
    WF_SUPPLIER_LIST: !hasBaseline || !hasMarketSnapshot,
    WF_MENU_COST: !hasMenuCard || !hasSupplierList,
    WF_MENU_PRICING: !hasBaseline || !hasMarketSnapshot,
    WF_REAL_ESTATE: !hasBaseline || !hasMarketSnapshot,
    WF_DIAGNOSTIC: !hasBaseline,
    WF_NEXT_BEST_ACTIONS: !hasBaseline || !hasKpiSet || !hasResearch,
    WF_MARKETING_STRATEGY: !hasBaseline,
    WF_KPI_ESTIMATION: !hasBaseline || !hasMarketSnapshot || !hasResearch || (!hasBusinessPlan && !hasScalingStrategy),
    WF_BUSINESS_PLAN: !hasBusinessPlanPrereqs,
    WF_DATA_COLLECTION_PLAN: false,
    WF_STARTUP_CONSULTING: false,
    WF_CUSTOMER_VALIDATION: !hasBaseline || !hasMarketSnapshot,
    WF_PROCESS_OPTIMIZATION: !hasBaseline,
    WF_STRATEGIC_OPTIONS: !hasBaseline,
    WF_VALUE_PROPOSITION: !hasBaseline || !hasMarketSnapshot,
    WF_GO_TO_MARKET: !hasBaseline || !hasMarketSnapshot,
    WF_SCALING_STRATEGY: !hasBaseline,
    WF_GROWTH_MARGIN_OPTIMIZATION: !hasBaseline,
    WF_GROWTH_BUSINESS_SUMMARY: !hasProfile,
    WF_GROWTH_OFFER_AUDIENCE_FUNNEL: !hasBaseline || !hasMarketSnapshot,
    WF_GROWTH_PAID_ADS: !hasBaseline || !hasMarketSnapshot,
    WF_GROWTH_SEO: !hasBaseline || !hasMarketSnapshot,
    WF_GROWTH_RETENTION_CONTENT: !hasBaseline,
    WF_GROWTH_EXECUTION_PLAN: !hasBaseline,
    WF_PORTFOLIO_MANAGEMENT: !hasBaseline,
    WF_SUBSIDY_RESEARCH: !hasProfile,
    WF_SCENARIO_ANALYSIS: !hasBaseline,
    WF_OPERATIVE_PLAN: !hasBaseline,
    WF_COMPETITOR_ANALYSIS: !hasBaseline || !hasMarketSnapshot,
    WF_SWOT: !hasBaseline || !hasMarketSnapshot,
    WF_FINANCIAL_PLANNING: !hasBaseline,
    WF_STRATEGIC_PLANNING: !hasBaseline || !hasMarketSnapshot,
    WF_TREND_ANALYSIS: !hasBaseline || !hasMarketSnapshot,
    WF_TECH_DIGITALIZATION: false,
    WF_AUTOMATION_ROI: false,
    WF_PHYSICAL_AUTOMATION: false,
    WF_INVENTORY_LAUNCH: !hasBaseline || !hasMarketSnapshot,
    WF_APP_DEVELOPMENT: false,
  };
  if (unlockAllWorkflowsFromEnv()) {
    for (const k of Object.keys(isLocked)) {
      isLocked[k] = false;
    }
  }
  const hasInProgressRun = runs.some((r) => ["draft", "running", "incomplete"].includes(r.status));

  const enabledWorkflowKeys = WIZARD_WORKFLOW_ORDER.filter((k) => {
    // Always allow competitor analysis: it is either independent or already handled via its own prerequisite checks.
    if (k === "WF_COMPETITOR_ANALYSIS") return true;
    const hasInProgress = runsByWorkflow[k]?.some((r) =>
      ["draft", "running", "incomplete"].includes(r.status)
    );
    const hasComplete = runsByWorkflow[k]?.some((r) =>
      ["complete", "approved"].includes(r.status)
    );
    return !isLocked[k] || hasInProgress || !hasComplete;
  });

  const optionalWorkflowKeys = [
    "WF_MENU_CARD",
    "WF_SUPPLIER_LIST",
    "WF_MENU_COST",
    "WF_MENU_PRICING",
    "WF_REAL_ESTATE",
    "WF_BUSINESS_PLAN",
    "WF_STARTUP_CONSULTING",
    "WF_TECH_DIGITALIZATION",
    "WF_AUTOMATION_ROI",
    "WF_PHYSICAL_AUTOMATION",
    "WF_INVENTORY_LAUNCH",
    "WF_APP_DEVELOPMENT",
  ].filter((k) => WIZARD_WORKFLOW_ORDER.includes(k));

  const enabledWorkflowKeysBase = enabledWorkflowKeys.filter((k) => !optionalWorkflowKeys.includes(k));

  const profileJson = (profile?.profileJson && typeof profile.profileJson === "object" ? (profile.profileJson as Record<string, unknown>) : {}) as Record<string, unknown>;
  const goals = Array.isArray(profileJson.goals) ? (profileJson.goals as string[]) : [];
  const aiRequests = Array.isArray(profileJson.ai_requests) ? (profileJson.ai_requests as string[]) : [];

  const wantsRealEstate = goals.includes("real_estate") || aiRequests.includes("find_real_estate");
  const wantsSupplierList =
    goals.includes("supplier_list") ||
    aiRequests.includes("find_supplier_whitelabel") ||
    aiRequests.includes("find_supplier_ingredients");

  const defaultSelectedOptionalWorkflowKeySet = new Set<string>();
  if (wantsSupplierList) {
    defaultSelectedOptionalWorkflowKeySet.add("WF_SUPPLIER_LIST");
    defaultSelectedOptionalWorkflowKeySet.add("WF_MENU_CARD");
    defaultSelectedOptionalWorkflowKeySet.add("WF_MENU_COST");
    defaultSelectedOptionalWorkflowKeySet.add("WF_MENU_PRICING");
  }
  if (wantsRealEstate) {
    defaultSelectedOptionalWorkflowKeySet.add("WF_REAL_ESTATE");
    if (wantsSupplierList) defaultSelectedOptionalWorkflowKeySet.add("WF_BUSINESS_PLAN");
  }
  const defaultSelectedOptionalWorkflowKeys = optionalWorkflowKeys.filter((k) => defaultSelectedOptionalWorkflowKeySet.has(k));

  const phasesToRender = assistantPhaseId
    ? PLANNING_PHASES.filter((p) => p.id === assistantPhaseId)
    : PLANNING_PHASES;

  // Gesamtfortschritt nur über die tatsächlich in Phasen sichtbaren Workflows
  // (ohne Profil-Intake). Keine Querschnitts-/Sonder-Keys mitzählen, die in
  // der Phasenansicht nicht als Karten auftauchen.
  const workflowsInOrder = [...new Set(
    PLANNING_PHASES.flatMap((p) => p.workflowKeys)
  )].filter((k) => k !== "WF_BUSINESS_FORM" && WORKFLOW_BY_KEY[k]);
  /** Abgeschlossener Run = für die Ausführungs-Ansicht „validiert“; manuelle Bestätigung nur im Run-/Audit-Detail. */
  function isRunValidated(run: { status: string }): boolean {
    if (run.status === "approved") return true;
    if (run.status !== "complete") return false;
    return true;
  }
  function runHasUnverifiedResponse(_run: unknown): boolean {
    return false;
  }
  function isWorkflowComplete(key: string): boolean {
    return workflowHasAllStepsValidated(key);
  }
  function isPhasePlanningComplete(phase: (typeof PLANNING_PHASES)[number]): boolean {
    const keys = phase.workflowKeys.filter((k) => k !== "WF_BUSINESS_FORM");
    const requiredKeys = keys.filter((k) => !optionalWorkflowKeys.includes(k));
    const keysToCheck = requiredKeys.length > 0 ? requiredKeys : keys;
    if (keysToCheck.length === 0) return false;
    return keysToCheck.every((k) => isWorkflowComplete(k));
  }
  const completedWorkflowCount = workflowsInOrder.filter(isWorkflowComplete).length;
  const progressPercent = workflowsInOrder.length ? Math.round((completedWorkflowCount / workflowsInOrder.length) * 100) : 0;
  const phaseSummaries = PLANNING_PHASES.map((phase) => {
    const keys = phase.workflowKeys.filter((k) => k !== "WF_BUSINESS_FORM");
    const completed = keys.filter((k) => isWorkflowComplete(k)).length;
    const total = Math.max(1, keys.length);
    const docs = collectPhaseArtifacts(phase).length;
    return {
      phase,
      completed,
      total,
      percent: Math.round((completed / total) * 100),
      docs,
      done: isPhasePlanningComplete(phase),
    };
  });
  const selectedOverviewSummary =
    phaseSummaries.find((p) => p.phase.id === selectedOverviewPhaseId) ?? phaseSummaries[0];
  const selectedOverviewArtifacts = selectedOverviewSummary ? collectPhaseArtifacts(selectedOverviewSummary.phase) : [];
  const phaseToStudyCategory: Record<string, StudyCategoryKey> = {
    ideation: "markt_geschaeftsmodell",
    validation: "produktstrategie",
    launch: "launch_marketing_investition",
    scaling: "wachstum_expansion",
    tech_digital: "technologie_digitalisierung",
    maturity: "reifephase",
    renewal: "erneuerung_exit",
  };
  const studyCtxByCategory = getStudyCategoryContext(locale);
  const selectedStudyCtx = selectedOverviewSummary
    ? studyCtxByCategory[phaseToStudyCategory[selectedOverviewSummary.phase.id] ?? "markt_geschaeftsmodell"]
    : null;
  const assistantPhase = assistantPhaseId
    ? PLANNING_PHASES.find((p) => p.id === assistantPhaseId) ?? null
    : null;
  const assistantStudyCtx = assistantPhase
    ? studyCtxByCategory[phaseToStudyCategory[assistantPhase.id] ?? "markt_geschaeftsmodell"]
    : null;
  const assistantPhaseDetailDe: Record<string, string> = {
    ideation:
      "Die KI analysiert hier Problem-Lösungs-Fit, Zielgruppe, Wertversprechen, Wettbewerbsumfeld und Trends. Ergebnis sind strukturierte Begründungen, Risiken, Chancen und priorisierte nächste Entscheidungen.",
    validation:
      "Die KI analysiert Machbarkeit, USP-Schärfe, Kundennutzen, Validierungssignale und Umsetzungsrisiken. Ziel ist eine evidenzbasierte Einschätzung, ob das Vorhaben in der Praxis tragfähig ist.",
    launch:
      "Die KI analysiert Markteintrittslogik, Preisgestaltung, Finanzierungsbedarf und operative Startfähigkeit. Ergebnis ist ein umsetzbarer Launch-Rahmen mit klaren Maßnahmen und Prioritäten.",
    scaling:
      "Die KI analysiert Wachstumshebel, Engpässe, Skalierbarkeit und Margenwirkung geplanter Maßnahmen. Ziel ist eine priorisierte Roadmap mit messbarem Beitrag zu Wachstum und Effizienz.",
    tech_digital:
      "Die KI analysiert Technologie- und Automatisierungsoptionen hinsichtlich Nutzen, Aufwand, Integrationsrisiko und ROI. Ergebnis ist eine vergleichbare Entscheidungsgrundlage für die Tool-Auswahl.",
    maturity:
      "Die KI analysiert Prozessqualität, Kostenhebel, Portfolio-Performance und Optimierungspotenziale. Ziel ist ein priorisierter Verbesserungsplan mit klarer wirtschaftlicher Wirkung.",
    renewal:
      "Die KI analysiert strategische Optionen inkl. Unternehmenswert-Schätzung, Exit-Kanäle/Plattformen, Börsengang, Unternehmensformwechsel und Expansion. Ergebnis ist eine belastbare Entscheidungsbasis für die nächste Richtung.",
  };
  const assistantPhaseDetailEn: Record<string, string> = {
    ideation:
      "Here the AI analyzes problem-solution fit, target group, value proposition, competition, and trends. The output is structured rationale, risks, opportunities, and prioritized next decisions.",
    validation:
      "Here the AI analyzes feasibility, USP strength, customer value, validation signals, and execution risks. The goal is an evidence-based viability assessment for real-world execution.",
    launch:
      "Here the AI analyzes go-to-market logic, pricing, funding needs, and operational launch readiness. The output is an actionable launch frame with clear priorities.",
    scaling:
      "Here the AI analyzes growth levers, bottlenecks, scalability, and margin impact of initiatives. The goal is a prioritized roadmap with measurable business effect.",
    tech_digital:
      "Here the AI analyzes technology and automation options by benefit, effort, integration risk, and ROI. The output is a comparable basis for tool decisions.",
    maturity:
      "Here the AI analyzes process quality, cost levers, portfolio performance, and optimization potential. The goal is a prioritized improvement plan with measurable impact.",
    renewal:
      "Here the AI analyzes strategic options including valuation estimate, exit channels/platforms, IPO suitability, legal form change, and expansion paths. The output is a decision-ready strategic view.",
  };

  return (
    <div className="space-y-8">
      {!assistantPhaseId && (
        <div className="grid w-full grid-cols-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)]/80 p-1 shadow-sm">
          <Link
            href="/dashboard?view=overview"
            prefetch={false}
            className={`rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
              activeView === "overview"
                ? "border border-[var(--card-border)] bg-[var(--background)] text-teal-700 shadow-sm dark:text-teal-300"
                : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            }`}
          >
            {isDe ? "Übersicht" : "Overview"}
          </Link>
          <Link
            href="/dashboard?view=execution"
            prefetch={false}
            className={`rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
              activeView === "execution"
                ? "border border-[var(--card-border)] bg-[var(--background)] text-teal-700 shadow-sm dark:text-teal-300"
                : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            }`}
          >
            {isDe ? "Ausführung" : "Execution"}
          </Link>
        </div>
      )}

      {params.run_error === "run_start_failed" && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          {t.dashboard.runStartFailed}
        </div>
      )}

      {activeView === "execution" && !assistantPhaseId && (
        <div>
          <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)]/90 p-4 shadow-sm sm:p-5">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
              {assistantPhase
                ? (isDe ? assistantPhase.name : (phaseNamesEn[assistantPhase.id] ?? assistantPhase.name))
                : `${t.dashboard.title} in ${t.dashboard.planningPhases}`}
            </h1>
            <p className="mt-2 text-[var(--muted)]">
              {assistantPhase
                ? (isDe
                    ? assistantPhaseDetailDe[assistantPhase.id] ?? assistantStudyCtx?.description ?? assistantPhase.goal
                    : assistantPhaseDetailEn[assistantPhase.id] ?? assistantStudyCtx?.description ?? phaseGoalsEn[assistantPhase.id] ?? assistantPhase.goal)
                : `${t.dashboard.subtitle} ${t.dashboard.planningPhasesDesc}`}
            </p>
          </header>
        </div>
      )}

      {activeView === "execution" && params.run_error === "llm_missing" && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          {isDe
            ? "Bitte hinterlege eine LLM API in den Einstellungen oder führe die Schritte manuell durch."
            : "Please configure an LLM API in Settings or execute the steps manually."}
        </div>
      )}
      {activeView === "execution" && params.run_success === "1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {isDe ? "Run wurde erfolgreich durchgeführt." : "Run completed successfully."}
        </div>
      )}

      {activeView === "overview" && (
        <div className="space-y-4 overflow-x-hidden">
          <div className="p-0">
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard?view=execution" prefetch={false} className="rounded-xl border border-cyan-200 bg-cyan-50/80 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-sm dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:hover:border-cyan-700">
              <p className="text-xs font-medium text-[var(--muted)]">{isDe ? "Gesamtfortschritt" : "Overall progress"}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{progressPercent}%</p>
              <p className="text-xs text-[var(--muted)]">
                {completedWorkflowCount}/{workflowsInOrder.length} {isDe ? "Prozessschritte abgeschlossen" : "process steps complete"}
              </p>
            </Link>
            <Link href="/dashboard?view=execution" prefetch={false} className="rounded-xl border border-violet-200 bg-violet-50/80 p-4 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-sm dark:border-violet-900/60 dark:bg-violet-950/20 dark:hover:border-violet-700">
              <p className="text-xs font-medium text-[var(--muted)]">{isDe ? "Phasen abgeschlossen" : "Phases complete"}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                {phaseSummaries.filter((p) => p.done).length}/{phaseSummaries.length}
              </p>
            </Link>
            <Link href="/artifacts" prefetch={false} className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:border-amber-700">
              <p className="text-xs font-medium text-[var(--muted)]">{isDe ? "Dokumente gesamt" : "Total documents"}</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{artifacts.length}</p>
            </Link>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-teal-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-5 mb-5 w-full max-w-full overflow-x-auto overflow-y-hidden pb-4" data-overview-phase-scroller>
            <div className="inline-flex min-w-max flex-nowrap gap-2">
            {phaseSummaries.map((summary) => {
              const { phase, completed, total } = summary;
              const active = selectedOverviewSummary?.phase.id === phase.id;
              return (
                <Link
                  key={phase.id}
                  href={`/dashboard?view=overview&phase=${phase.id}`}
                  prefetch={false}
                  data-overview-phase-chip-link="1"
                  data-overview-phase-chip={active ? "active" : "0"}
                  className={`min-w-[250px] rounded-xl px-4 py-3 text-left shadow-sm transition ${
                    active
                      ? "border border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-200"
                      : "border border-[var(--card-border)] bg-[var(--card)] text-[var(--muted)] hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                  }`}
                >
                  <p className="text-sm font-semibold">{isDe ? phase.name : (phaseNamesEn[phase.id] ?? phase.name)}</p>
                  <p className={`mt-1 text-xs ${active ? "text-teal-700 dark:text-teal-300" : "text-[var(--muted)]"}`}>
                    {completed} {isDe ? "von" : "of"} {total} {isDe ? "Prozessen abgeschlossen" : "processes completed"}
                  </p>
                  <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${active ? "bg-teal-100 dark:bg-teal-900/40" : "bg-slate-200 dark:bg-slate-700"}`}>
                    <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.round((completed / Math.max(1, total)) * 100)}%` }} />
                  </div>
                </Link>
              );
            })}
            </div>
          </div>

          {selectedOverviewSummary && (
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm space-y-4">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/30 p-4">
                <div className="">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h4 className="text-base font-semibold text-[var(--foreground)]">
                      {isDe ? selectedOverviewSummary.phase.name : (phaseNamesEn[selectedOverviewSummary.phase.id] ?? selectedOverviewSummary.phase.name)}
                    </h4>
                    <PhaseRunButtonForm
                      formId={`overview-phase-run-${selectedOverviewSummary.phase.id}`}
                      phaseId={selectedOverviewSummary.phase.id}
                      buttonLabel={isDe ? "Ausführen" : "Run"}
                      workflows={selectedOverviewSummary.phase.workflowKeys
                        .filter((k) => k !== "WF_BUSINESS_FORM")
                        .map((k) => ({
                          key: k,
                          name: isDe
                            ? (WORKFLOW_BY_KEY[k]?.name ?? k)
                            : (workflowNamesEn[k] ?? WORKFLOW_BY_KEY[k]?.name ?? k),
                        }))}
                    />
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {isDe ? selectedOverviewSummary.phase.goal : (phaseGoalsEn[selectedOverviewSummary.phase.id] ?? selectedOverviewSummary.phase.goal)}
                  </p>
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    {selectedStudyCtx?.description ?? ""}
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{isDe ? t.study.studyInfoWhatDone : "What is analyzed here?"}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
                        {(selectedStudyCtx?.workflowKeys ?? []).map((wk) => (
                          <li key={wk}>{isDe ? (WORKFLOW_BY_KEY[wk]?.name ?? wk) : (workflowNamesEn[wk] ?? WORKFLOW_BY_KEY[wk]?.name ?? wk)}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">{isDe ? t.study.studyInfoWhatImportant : "What is important?"}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
                        {(selectedStudyCtx?.important ?? []).map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold text-[var(--foreground)]">{isDe ? "Workflows" : "Workflows"}</p>
                  <div className="space-y-3">
                    {selectedOverviewSummary.phase.workflowKeys
                      .filter((k) => k !== "WF_BUSINESS_FORM")
                      .map((key, idx) => {
                        const locked = isLocked[key];
                        const hasComplete = isWorkflowComplete(key);
                        const hasInProgress = !hasComplete && latestRunIsInProgress(key);
                        // Fallback: Wenn ein Artifact vorhanden ist (=> "Abgeschlossen"),
                        // aber der Run noch nicht auf status=complete gesetzt wurde
                        // (historische Daten / Single-Step-Workflows vor dem Fix),
                        // dann zeigen wir trotzdem "Lauf ansehen" auf den letzten Run.
                        const completeRun = latestCompletedRunForWorkflow(key) ?? (hasComplete ? latestRunForWorkflow(key) : undefined);
                        const statusLabel = locked
                          ? (isDe ? "Gesperrt" : "Locked")
                          : hasComplete
                            ? (isDe ? "Abgeschlossen" : "Complete")
                            : (isDe ? "Offen" : "Open");
                        const statusClass = locked
                          ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
                          : hasComplete
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300";
                        return (
                          <div key={key} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[11px] text-[var(--muted)]">{isDe ? "Schritt" : "Step"} {idx + 1}</p>
                                <p className="text-sm font-medium text-[var(--foreground)]">{isDe ? (WORKFLOW_BY_KEY[key]?.name ?? key) : (workflowNamesEn[key] ?? WORKFLOW_BY_KEY[key]?.name ?? key)}</p>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>{statusLabel}</span>
                            </div>
                            <div className="mt-2">
                              {hasInProgress ? (
                                <form action={createRunWorkflowAction}>
                                  <input type="hidden" name="workflow_key" value={key} />
                                  <input type="hidden" name="return_target" value="dashboard" />
                                  <input type="hidden" name="return_view" value="overview" />
                                  <input type="hidden" name="return_phase" value={selectedOverviewSummary.phase.id} />
                                  <button type="submit" className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">{isDe ? "Fortsetzen" : "Continue"}</button>
                                </form>
                              ) : hasComplete && completeRun ? (
                                <Link href={`/runs/${completeRun.id}`} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">{isDe ? "Lauf ansehen" : "View run"}</Link>
                              ) : (
                                <form action={createRunWorkflowAction}>
                                  <input type="hidden" name="workflow_key" value={key} />
                                  <input type="hidden" name="return_target" value="dashboard" />
                                  <input type="hidden" name="return_view" value="overview" />
                                  <input type="hidden" name="return_phase" value={selectedOverviewSummary.phase.id} />
                                  <button type="submit" disabled={locked} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{isDe ? "Starten" : "Start"}</button>
                                </form>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div className="space-y-4">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
                  <p className="text-xs font-medium text-[var(--muted)]">{isDe ? "Abschluss (Phase)" : "Completion (phase)"}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <div
                      className="grid h-24 w-24 place-items-center rounded-full"
                      style={{
                        background: `conic-gradient(rgb(13 148 136) ${selectedOverviewSummary.percent * 3.6}deg, rgb(226 232 240) 0deg)`,
                      }}
                    >
                      <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--card)] text-sm font-semibold text-[var(--foreground)]">
                        {selectedOverviewSummary.percent}%
                      </div>
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      <div>{selectedOverviewSummary.completed}/{selectedOverviewSummary.total} {isDe ? "abgeschlossene Prozesse" : "completed processes"}</div>
                      <div>{selectedOverviewSummary.docs} {isDe ? "Dokumente" : "documents"}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
                  <p className="mb-2 text-xs font-medium text-[var(--muted)]">{isDe ? "Dokumente" : "Documents"}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOverviewArtifacts
                      .map(({ workflowKey, artifactType, artifact }) => (
                        <Link key={`${workflowKey}:${artifactType}:${artifact.id}`} href={`/artifacts/${artifact.id}`} className="rounded-lg border border-teal-200 bg-teal-50/50 px-2.5 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200">
                          {artifactChipLabel(workflowKey, artifactType, artifact)}
                        </Link>
                      ))}
                    {selectedOverviewArtifacts.length === 0 && (
                      <p className="text-xs text-[var(--muted)]">{isDe ? "Noch keine Dokumente in dieser Phase." : "No documents in this phase yet."}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}
          </div>
        </div>
      )}

      {activeView === "execution" && !assistantPhaseId && (
      <Section title="">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-[var(--muted)]">{isDe ? "Gesamtfortschritt" : "Overall progress"}</span>
            <span className="text-sm font-semibold text-[var(--foreground)]">{completedWorkflowCount}/{workflowsInOrder.length} {isDe ? "Prozesse" : "workflows"} ({progressPercent}%)</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <RunAllQuickActions
            workflowKeys={enabledWorkflowKeysBase}
            optionalWorkflowKeys={optionalWorkflowKeys}
            defaultSelectedOptionalWorkflowKeys={defaultSelectedOptionalWorkflowKeys}
            artifactsHref="/artifacts"
            artifactsLabel={t.common.viewArtifacts}
            showArtifactsButton={false}
            labels={{
              runProcess: isDe ? "Ausführen des KI-Prozesses" : "Run AI process",
              running: isDe ? "Läuft..." : "Running...",
            }}
          />
        </div>
      </Section>
      )}

      {activeView === "execution" && (
      <div>
        {!assistantPhaseId && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">{isDe ? "Unternehmensprofil anlegen" : "Create company profile"}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
                  {isDe ? "Formularschritt vor den KI-Prozessen." : "Form step before the AI workflows."}
            </p>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--foreground)]">{isDe ? "Unternehmensprofil anlegen" : "Create company profile"}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {hasProfile ? (isDe ? "Profil vollständig" : "Profile complete") : (isDe ? "Profil noch unvollständig" : "Profile incomplete")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/profile"
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    {hasProfile ? (isDe ? "Profil ansehen" : "View profile") : (isDe ? "Profil ausfüllen" : "Complete profile")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-6 space-y-8">
          {phasesToRender.map((phase) => {
            const phaseWorkflows = phase.workflowKeys
              .filter((k) => k !== "WF_BUSINESS_FORM")
              .map((k) => WORKFLOW_BY_KEY[k])
              .filter(Boolean) as { key: string; name: string; description: string }[];
            const phaseFormId = `phase-run-${phase.id}`;
            const phaseArtifactTypes = [...new Set(phase.workflowKeys.flatMap((k) => WORKFLOW_TO_ARTIFACTS[k] ?? []))];
            const phaseArtifacts = phaseArtifactTypes
              .map((type) => {
                const a = artifacts.find((x) => x.type === type);
                return a ? { type, artifact: a } : null;
              })
              .filter(Boolean) as { type: string; artifact: { id: string; type: string; title: string } }[];
            const decisionPackInPhase = phase.workflowKeys.includes("WF_NEXT_BEST_ACTIONS") && decisions.length > 0;
            if (phaseWorkflows.length === 0 && phase.id !== "validation" && phase.id !== "maturity" && phase.id !== "renewal") return null;
            const phaseReleased = !!phaseReleasedMap[phase.id];
            const phasePlanningComplete = isPhasePlanningComplete(phase);
            const phaseCardShell = phaseReleased
              ? "border-emerald-400/90 bg-emerald-50/45 dark:border-emerald-600 dark:bg-emerald-950/30 shadow-sm ring-1 ring-emerald-500/25"
              : phasePlanningComplete
                ? "border-[var(--card-border)] bg-[var(--card)]/50"
                : "border-[var(--card-border)] bg-[var(--card)]/50";
            return (
              <div id={`phase-${phase.id}`} key={phase.id} className={`scroll-mt-24 rounded-2xl border p-6 ${phaseCardShell}`}>
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{isDe ? phase.name : (phaseNamesEn[phase.id] ?? phase.name)}</h3>
                    {phaseWorkflows.length > 0 && (
                      <PhaseRunButtonForm
                        formId={phaseFormId}
                        phaseId={phase.id}
                        buttonLabel={isDe ? "Ausführen" : "Run"}
                        workflows={phaseWorkflows.map((wf) => ({ key: wf.key, name: isDe ? wf.name : (workflowNamesEn[wf.key] ?? wf.name) }))}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{isDe ? phase.goal : (phaseGoalsEn[phase.id] ?? phase.goal)}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {isDe
                      ? assistantPhaseDetailDe[phase.id] ?? ""
                      : assistantPhaseDetailEn[phase.id] ?? ""}
                  </p>
                </div>
                {phaseWorkflows.length > 0 ? (
                  <details data-phase-details={phase.id} className="group rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block text-xs text-[var(--muted)] transition-transform duration-200 group-open:rotate-90"
                          aria-hidden
                        >
                          ▸
                        </span>
                        {isDe ? "Prozessschritte anzeigen" : "Show process steps"}
                      </span>
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-end">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--muted)]">
                          <input
                            type="checkbox"
                            defaultChecked
                            data-phase-toggle={phase.id}
                            className="h-4 w-4 rounded border-[var(--card-border)] text-teal-600 focus:ring-teal-500"
                          />
                          {isDe ? "Alle an/aus" : "Toggle all"}
                        </label>
                      </div>
                      {phaseWorkflows.map((wf) => {
                      const locked = isLocked[wf.key];
                      const hasComplete = isWorkflowComplete(wf.key);
                      const hasInProgress = !hasComplete && latestRunIsInProgress(wf.key);
                      const completeRun = latestCompletedRunForWorkflow(wf.key) ?? (hasComplete ? latestRunForWorkflow(wf.key) : undefined);
                      const wfArtifactTypes = WORKFLOW_TO_ARTIFACTS[wf.key] ?? [];
                      const wfArtifactItems = wfArtifactTypes.map((artifactType) => {
                        const workflowRunIds = new Set((runsByWorkflow[wf.key] ?? []).map((run) => run.id));
                        const scoped = artifacts.find(
                          (a) => a.type === artifactType && a.runId && workflowRunIds.has(a.runId)
                        );
                        let artifact = scoped;
                        // Hotfix compatibility: in some DBs PESTEL is persisted as trend_analysis fallback.
                        if (!artifact && wf.key === "WF_TREND_ANALYSIS" && artifactType === "pestel_analysis") {
                          const scopedPestelFallback = artifacts.find(
                            (a) =>
                              a.type === "trend_analysis" &&
                              a.runId &&
                              workflowRunIds.has(a.runId) &&
                              /pestel/i.test(a.title ?? "")
                          );
                          artifact = scopedPestelFallback;
                        }
                        return { type: artifactType, artifact };
                      });
                      const isComplete = isWorkflowComplete(wf.key);
                      const completeRunValidated = completeRun ? isRunValidated(completeRun) : false;
                      const isCompleteUnvalidated = isComplete && completeRun && !completeRunValidated;
                      const hasUnverifiedResponse = runsByWorkflow[wf.key]?.some(runHasUnverifiedResponse);
                      const showUnvalidated = isCompleteUnvalidated || hasUnverifiedResponse;
                      const stepLabels = isDe
                        ? (WORKFLOW_STEP_LABELS[wf.key] ?? [])
                        : (workflowStepLabelsEn[wf.key] ?? WORKFLOW_STEP_LABELS[wf.key] ?? []);
                      return (
                        <div
                          key={wf.key}
                          className={`rounded-xl border p-4 transition-colors ${
                            showUnvalidated
                              ? "border-amber-300 bg-amber-50/90 dark:border-amber-600 dark:bg-amber-900/30"
                              : isComplete
                                ? "border-slate-300 bg-slate-200/90 dark:border-slate-600 dark:bg-slate-800/70"
                                : locked
                                  ? "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/20"
                                  : "border-[var(--card-border)] bg-[var(--card)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  name="workflow_keys"
                                  value={wf.key}
                                  // Continue-Run soll auch bereits gestartete (draft/incomplete)
                                  // Workflows mitnehmen; nur vollständig abgeschlossene
                                  // Workflows bleiben standardmäßig abgewählt.
                                  defaultChecked={!hasComplete}
                                  form={phaseFormId}
                                  data-phase-workflow={phase.id}
                                  className="h-4 w-4 rounded border-[var(--card-border)] text-teal-600 focus:ring-teal-500"
                                />
                                <p className="font-medium text-[var(--foreground)]">{isDe ? wf.name : (workflowNamesEn[wf.key] ?? wf.name)}</p>
                              </div>
                              {stepLabels.length > 1 && (
                                <p className="mt-1 text-xs text-[var(--muted)]/80">
                                  {isDe ? "Unterworkflows" : "Sub-workflows"}: {stepLabels.join(" -> ")}
                                </p>
                              )}
                              {showUnvalidated && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                  {isDe ? "Prüfung ausstehend – Schritte im Run verifizieren" : "Review pending - verify steps in run"}
                                </p>
                              )}
                              {locked && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                  {wf.key === "WF_BUSINESS_PLAN"
                                    ? (isDe ? "Grundlagenanalyse, Warum Unternehmen scheitern, Lieferantenliste und Standortoptionen erforderlich" : "Baseline, failure analysis, supplier list, and location options required")
                                    : wf.key === "WF_BASELINE"
                                      ? (isDe ? "Grundlagenanalyse, Marktüberblick, Marktanalyse und Businessplan erforderlich" : "Baseline, market snapshot, market research, and business plan required")
                                      : ["WF_RESEARCH", "WF_SUPPLIER_LIST", "WF_REAL_ESTATE", "WF_CUSTOMER_VALIDATION", "WF_VALUE_PROPOSITION", "WF_GO_TO_MARKET", "WF_SWOT", "WF_COMPETITOR_ANALYSIS", "WF_STRATEGIC_PLANNING", "WF_TREND_ANALYSIS"].includes(wf.key)
                                        ? (isDe ? "Grundlagenanalyse und Marktüberblick erforderlich" : "Baseline and market snapshot required")
                                        : wf.key === "WF_NEXT_BEST_ACTIONS"
                                          ? (isDe ? "Grundlagenanalyse, KPI-Set und Marktanalyse erforderlich" : "Baseline, KPI set, and market research required")
                                          : (isDe ? "Grundlagenanalyse erforderlich" : "Baseline required")}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {wf.key === "WF_BUSINESS_FORM" && isComplete ? (
                                <Link href="/profile" className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                                  {isDe ? "Profil ansehen" : "View profile"}
                                </Link>
                              ) : hasInProgress ? (
                                <form action={createRunWorkflowAction}>
                                  <input type="hidden" name="workflow_key" value={wf.key} />
                                  <input type="hidden" name="return_target" value="dashboard" />
                                  <input type="hidden" name="return_view" value="execution" />
                                  {assistantPhaseId ? <input type="hidden" name="return_assistant_phase" value={assistantPhaseId} /> : null}
                                  <button type="submit" disabled={locked} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                                    {isDe ? "Fortsetzen" : "Continue"}
                                  </button>
                                </form>
                              ) : hasComplete && completeRun ? (
                                <>
                                  <Link href={`/runs/${completeRun.id}`} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                                    {isDe ? "Lauf ansehen" : "View run"}
                                  </Link>
                                  <form action={createRunWorkflowAction} className="inline">
                                    <input type="hidden" name="workflow_key" value={wf.key} />
                                    <input type="hidden" name="force_new" value="1" />
                                    <input type="hidden" name="return_target" value="dashboard" />
                                    <input type="hidden" name="return_view" value="execution" />
                                    {assistantPhaseId ? <input type="hidden" name="return_assistant_phase" value={assistantPhaseId} /> : null}
                                    <button type="submit" disabled={locked} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-teal-50 dark:hover:bg-teal-950/30">
                                      {isDe ? "Erneut" : "Rerun"}
                                    </button>
                                  </form>
                                </>
                              ) : (
                                <form action={createRunWorkflowAction}>
                                  <input type="hidden" name="workflow_key" value={wf.key} />
                                  <input type="hidden" name="return_target" value="dashboard" />
                                  <input type="hidden" name="return_view" value="execution" />
                                  {assistantPhaseId ? <input type="hidden" name="return_assistant_phase" value={assistantPhaseId} /> : null}
                                  <button type="submit" disabled={locked} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                                    {isDe ? "Starten" : "Start"}
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                          {wfArtifactItems.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-3">
                              {wfArtifactItems.map(({ type, artifact }) =>
                                artifact ? (
                                  <Link
                                    key={`${type}:${artifact.id}`}
                                    href={type === "decision_pack" ? "/decisions" : `/artifacts/${artifact.id}`}
                                    className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-900/50"
                                  >
                                    {getWorkflowArtifactLabel(wf.key, type, locale)} →
                                  </Link>
                                ) : (
                                  <span
                                    key={type}
                                    className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400"
                                  >
                                    {getWorkflowArtifactLabel(wf.key, type, locale)} {isDe ? "(fehlt)" : "(missing)"}
                                  </span>
                                )
                              )}
                              {wf.key === "WF_NEXT_BEST_ACTIONS" && decisions.length > 0 && (
                                <Link href="/decisions" className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-900/50">
                                  {isDe ? "Top-Entscheidungen" : "Top decisions"} →
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  </details>
                ) : (
                  <p className="text-sm text-[var(--muted)]">{isDe ? "Noch keine Prozesse für diese Phase." : "No workflows in this phase yet."}</p>
                )}
                {/*{(phaseArtifacts.length > 0 || decisionPackInPhase) && (
                  <PhaseArtifactsReleaseBlock
                    phaseId={phase.id}
                    phaseName={isDe ? phase.name : (phaseNamesEn[phase.id] ?? phase.name)}
                    released={phaseReleased}
                    labels={{
                      sectionTitle: t.dashboard.phaseArtifactsSection,
                      releaseBtn: t.dashboard.phaseReleaseBtn,
                      revokeBtn: t.dashboard.phaseRevokeReleaseBtn,
                      confirmReleaseTitle: t.dashboard.phaseReleaseConfirmTitle,
                      confirmReleaseBody: t.dashboard.phaseReleaseConfirmBody,
                      confirmRevokeTitle: t.dashboard.phaseRevokeConfirmTitle,
                      confirmRevokeBody: t.dashboard.phaseRevokeConfirmBody,
                      confirmRelease: t.dashboard.phaseReleaseConfirm,
                      confirmRevoke: t.dashboard.phaseRevokeConfirm,
                      cancel: t.dashboard.phaseReleaseCancel,
                    }}
                  >
                    <>
                      {phaseArtifacts.map(({ type, artifact }) => (
                        <Link
                          key={artifact.id}
                          href={`/artifacts/${artifact.id}`}
                          className="rounded-lg border border-teal-200/70 bg-teal-100/50 px-3 py-2 text-sm font-medium text-teal-900/80 grayscale-[0.2] transition hover:border-teal-300 hover:bg-teal-100/70 dark:border-teal-800/70 dark:bg-teal-950/35 dark:text-teal-100/80 dark:hover:border-teal-700 dark:hover:bg-teal-950/45"
                        >
                          {artifact.title || getWorkflowArtifactLabel("", type, locale)}
                        </Link>
                      ))}
                      {decisionPackInPhase && (
                        <Link href="/decisions" className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium transition hover:border-teal-300 hover:shadow dark:hover:border-teal-700">
                          {isDe ? "Top-Entscheidungen" : "Top decisions"}
                        </Link>
                      )}
                    </>
                  </PhaseArtifactsReleaseBlock>
                )}*/}
              </div>
            );
          })}
        </div>
      </div>
      )}

      {activeView === "execution" && !assistantPhaseId && (
      <Script id="phase-workflow-checkbox-toggle" strategy="afterInteractive">{`
        (function () {
          function openPhaseFromHash() {
            var hash = window.location.hash || "";
            if (!hash.startsWith("#phase-")) return;
            var phaseId = hash.slice("#phase-".length);
            var details = document.querySelector('details[data-phase-details="' + phaseId + '"]');
            if (details) details.open = true;
          }

          function syncToggleForPhase(phaseId) {
            var items = Array.prototype.slice.call(document.querySelectorAll('input[data-phase-workflow="' + phaseId + '"]'));
            var toggle = document.querySelector('input[data-phase-toggle="' + phaseId + '"]');
            if (!toggle || items.length === 0) return;
            var checkedCount = items.filter(function (el) { return el.checked; }).length;
            toggle.checked = checkedCount === items.length;
            toggle.indeterminate = checkedCount > 0 && checkedCount < items.length;
          }

          function bindPhaseToggles() {
            var toggles = Array.prototype.slice.call(document.querySelectorAll("input[data-phase-toggle]"));
            toggles.forEach(function (toggle) {
              if (toggle.dataset.boundToggle === "1") return;
              toggle.dataset.boundToggle = "1";
              var phaseId = toggle.getAttribute("data-phase-toggle");
              if (!phaseId) return;

              var items = Array.prototype.slice.call(document.querySelectorAll('input[data-phase-workflow="' + phaseId + '"]'));
              toggle.addEventListener("change", function () {
                items.forEach(function (el) { el.checked = toggle.checked; });
                syncToggleForPhase(phaseId);
              });

              items.forEach(function (el) {
                if (el.dataset.boundItem === "1") return;
                el.dataset.boundItem = "1";
                el.addEventListener("change", function () { syncToggleForPhase(phaseId); });
              });

              syncToggleForPhase(phaseId);
            });
          }

          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
              bindPhaseToggles();
              openPhaseFromHash();
            });
          } else {
            bindPhaseToggles();
            openPhaseFromHash();
          }
          window.addEventListener("hashchange", openPhaseFromHash);
        })();
      `}</Script>
      )}

      {activeView === "overview" && (
      <Script id="overview-phase-chip-scroll" strategy="afterInteractive">{`
        (function () {
          function alignChipInScroller(scroller, chip) {
            if (!scroller || !chip) return;
            scroller.style.paddingLeft = "";
            scroller.style.paddingRight = "";
            var scrollerRect = scroller.getBoundingClientRect();
            var chipRect = chip.getBoundingClientRect();
            // Aktive Phase horizontal mittig im sichtbaren Scrollbereich
            // positionieren. Wenn das nicht möglich ist (am Anfang/Ende der
            // Liste), wird der Wert durch clamp(0, maxScroll) begrenzt – so
            // bleibt z. B. die erste/letzte Phase sichtbar.
            var chipCenter = chipRect.left + chipRect.width / 2;
            var scrollerCenter = scrollerRect.left + scroller.clientWidth / 2;
            var newScroll = scroller.scrollLeft + (chipCenter - scrollerCenter);
            var maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
            var next = Math.max(0, Math.min(newScroll, maxScroll));
            scroller.scrollTo({ left: next, behavior: "auto" });
          }

          function alignOverviewPhaseChip() {
            var scroller = document.querySelector("[data-overview-phase-scroller]");
            if (!scroller) return;
            var activeChip = scroller.querySelector('[data-overview-phase-chip="active"]');
            if (!scroller || !activeChip) return;
            alignChipInScroller(scroller, activeChip);
          }

          function bindPhaseChipClicks() {
            var scroller = document.querySelector("[data-overview-phase-scroller]");
            if (!scroller || scroller.dataset.boundChipClicks === "1") return;
            scroller.dataset.boundChipClicks = "1";
            scroller.addEventListener("click", function (e) {
              var target = e.target;
              if (!(target instanceof Element)) return;
              var chip = target.closest('[data-overview-phase-chip-link="1"]');
              if (!chip) return;
              setTimeout(function () {
                alignChipInScroller(scroller, chip);
              }, 0);
            });

            var obs = new MutationObserver(function () {
              alignOverviewPhaseChip();
            });
            obs.observe(scroller, {
              subtree: true,
              childList: true,
              attributes: true,
              attributeFilter: ["data-overview-phase-chip", "class"]
            });
          }
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
              bindPhaseChipClicks();
              alignOverviewPhaseChip();
            });
          } else {
            bindPhaseChipClicks();
            alignOverviewPhaseChip();
          }
          setTimeout(alignOverviewPhaseChip, 60);
          setTimeout(alignOverviewPhaseChip, 180);
          window.addEventListener("pageshow", alignOverviewPhaseChip);
          window.addEventListener("resize", alignOverviewPhaseChip);
        })();
      `}</Script>
      )}
    </div>
  );
}

