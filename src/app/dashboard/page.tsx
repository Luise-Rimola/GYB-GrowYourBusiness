import Link from "next/link";
import Script from "next/script";
import { prisma } from "@/lib/prisma";
import { createRunWorkflowAction } from "@/app/actions";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { WORKFLOWS, WORKFLOW_BY_KEY, getWorkflowSubtitle } from "@/lib/workflows";
import { PLANNING_PHASES, PLANNING_AREAS, WIZARD_WORKFLOW_ORDER, WORKFLOW_STEP_LABELS, WORKFLOW_TO_ARTIFACTS, ARTIFACT_LABELS } from "@/lib/planningFramework";
import { getEarlyWarningDetails, getEarlyWarningPrimaryRiskText, hasEarlyWarningSignal } from "@/lib/earlyWarning";
import { EarlyWarningPopover } from "@/components/EarlyWarningPopover";
import { RunAllQuickActions } from "@/components/RunAllQuickActions";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { WorkflowService } from "@/services/workflows";
import { getPlanningPhaseReleasedMap } from "@/lib/planningPhaseRelease";
import { PhaseArtifactsReleaseBlock } from "@/components/PhaseArtifactsReleaseBlock";
import { PhaseRunButtonForm } from "@/components/PhaseRunButtonForm";

function getWorkflowArtifactLabel(workflowKey: string, artifactType: string) {
  if (workflowKey === "WF_IDEA_USP_VALIDATION" && artifactType === "value_proposition") {
    return "Idee- & USP-Validierung";
  }
  if (workflowKey === "WF_LEGAL_FOUNDATION" && artifactType === "startup_guide") {
    return "Rechtliche Vorgaben & Unternehmensform";
  }
  return ARTIFACT_LABELS[artifactType] ?? artifactType;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ assistant_phase?: string; run_error?: string; run_success?: string }>;
}) {
  const params = await searchParams;
  const assistantPhaseId = String(params.assistant_phase ?? "").trim();
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  let [
    artifacts,
    decisions,
    runs,
    profile,
    baselineArtifact,
    kpiSet,
    recentRuns,
  ] = await Promise.all([
    prisma.artifact.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.decision.findMany({ where: { companyId: company.id } }),
    prisma.run.findMany({
      where: { companyId: company.id },
      include: { steps: true },
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
  ]);

  // Fehlende Dokumente aus Läufen erstellen (z.B. work_processes bei WF_FINANCIAL_PLANNING, competitor_analysis bei WF_COMPETITOR_ANALYSIS)
  const completeFinancialRun = recentRuns.find((r) => r.workflowKey === "WF_FINANCIAL_PLANNING" && r.status === "complete");
  const competitorRun = runs.find((r) => r.workflowKey === "WF_COMPETITOR_ANALYSIS" && ["draft", "complete", "incomplete"].includes(r.status));
  let anyCreated = false;
  for (const runToFix of [completeFinancialRun, competitorRun].filter(Boolean)) {
    if (!runToFix) continue;
    try {
      const { created } = await WorkflowService.createMissingArtifactsForRun(runToFix.id);
      if (created.length > 0) anyCreated = true;
    } catch (err) {
      console.warn("[Dashboard] createMissingArtifactsForRun failed:", err);
    }
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
    WF_PORTFOLIO_MANAGEMENT: !hasBaseline,
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
    WF_APP_DEVELOPMENT: false,
  };
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

  const phaseReleasedMap = await getPlanningPhaseReleasedMap(company.id);
  const phasesToRender = assistantPhaseId
    ? PLANNING_PHASES.filter((p) => p.id === assistantPhaseId)
    : PLANNING_PHASES;

  const workflowsInOrder = WIZARD_WORKFLOW_ORDER.filter((k) => WORKFLOW_BY_KEY[k]);
  function isRunValidated(run: { status: string; steps?: { stepKey: string; schemaValidationPassed: boolean; verifiedByUser: boolean; createdAt: Date }[] }): boolean {
    if (run.status === "approved") return true;
    if (run.status !== "complete") return false;
    const steps = (run.steps ?? []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestByKey = new Map<string, (typeof steps)[0]>();
    for (const s of steps) {
      if (!latestByKey.has(s.stepKey)) latestByKey.set(s.stepKey, s);
    }
    const completedSteps = [...latestByKey.values()].filter((s) => s.schemaValidationPassed);
    if (completedSteps.length === 0) return true;
    return completedSteps.every((s) => s.verifiedByUser);
  }
  function runHasUnverifiedResponse(run: { steps?: { stepKey: string; schemaValidationPassed: boolean; verifiedByUser: boolean; createdAt: Date }[] }): boolean {
    const steps = (run.steps ?? []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestByKey = new Map<string, (typeof steps)[0]>();
    for (const s of steps) {
      if (!latestByKey.has(s.stepKey)) latestByKey.set(s.stepKey, s);
    }
    const completedSteps = [...latestByKey.values()].filter((s) => s.schemaValidationPassed);
    if (completedSteps.length === 0) return false;
    return completedSteps.some((s) => !s.verifiedByUser);
  }
  function isWorkflowComplete(key: string): boolean {
    if (key === "WF_BUSINESS_FORM") return hasProfile;
    const hasComplete = runsByWorkflow[key]?.some((r) => r.status === "complete" || r.status === "approved");
    const hasInProgress = runsByWorkflow[key]?.some((r) => ["draft", "running", "incomplete"].includes(r.status));
    return !!hasComplete && !hasInProgress;
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t.dashboard.title}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          {t.dashboard.subtitle}
        </p>
      </header>

      {params.run_error === "llm_missing" && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          Bitte hinterlege eine LLM API in den Einstellungen oder führe die Schritte manuell durch.
        </div>
      )}
      {params.run_success === "1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          Run wurde erfolgreich durchgeführt.
        </div>
      )}

      {!assistantPhaseId && (
      <Section title="">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-[var(--muted)]">Gesamtfortschritt</span>
            <span className="text-sm font-semibold text-[var(--foreground)]">{completedWorkflowCount}/{workflowsInOrder.length} Prozesse ({progressPercent}%)</span>
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
          />
        </div>
      </Section>
      )}

      <div>
        {!assistantPhaseId && (
          <h2 className="text-xl font-semibold text-[var(--foreground)]">{t.dashboard.planningPhases}</h2>
        )}
        {!assistantPhaseId && (
          <p className="mt-1 text-sm text-[var(--muted)]">{t.dashboard.planningPhasesDesc}</p>
        )}
        {!assistantPhaseId && (
          <div className="mt-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]/50 p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Business Form</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
                  Formularschritt vor den KI-Prozessen.
            </p>
            <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--foreground)]">Business Form</p>
                  <p className="text-xs text-[var(--muted)]">
                    {hasProfile ? "Profil vollständig" : "Profil noch unvollständig"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/profile"
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    {hasProfile ? "Profil ansehen" : "Profil ausfüllen"}
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
                ? "border-amber-400/90 bg-amber-50/55 dark:border-amber-600 dark:bg-amber-950/25 shadow-sm ring-1 ring-amber-400/35"
                : "border-[var(--card-border)] bg-[var(--card)]/50";
            return (
              <div id={`phase-${phase.id}`} key={phase.id} className={`scroll-mt-24 rounded-2xl border p-6 ${phaseCardShell}`}>
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{phase.name}</h3>
                    {phaseWorkflows.length > 0 && (
                      <PhaseRunButtonForm
                        formId={phaseFormId}
                        phaseId={phase.id}
                        buttonLabel="Ausführen"
                        workflows={phaseWorkflows.map((wf) => ({ key: wf.key, name: wf.name }))}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{phase.goal}</p>
                  {phase.instruments && phase.instruments.length > 0 && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Instrumente: {phase.instruments.slice(0, 5).join(", ")}
                      {phase.instruments.length > 5 ? " …" : ""}
                    </p>
                  )}
                </div>
                {phaseWorkflows.length > 0 ? (
                  <details data-phase-details={phase.id} className="group rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">
                      Prozesse anzeigen
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
                          Alle an/aus
                        </label>
                      </div>
                      {phaseWorkflows.map((wf) => {
                      const locked = isLocked[wf.key];
                      const hasComplete = runsByWorkflow[wf.key]?.some((r) => r.status === "complete" || r.status === "approved");
                      const hasInProgress = runsByWorkflow[wf.key]?.some((r) => ["draft", "running", "incomplete"].includes(r.status));
                      const latestRun = runsByWorkflow[wf.key]?.[0];
                      const completeRun = runsByWorkflow[wf.key]?.find((r) => r.status === "complete" || r.status === "approved");
                      const wfArtifactTypes = WORKFLOW_TO_ARTIFACTS[wf.key] ?? [];
                      const wfArtifactItems = wfArtifactTypes.map((artifactType) => {
                        const workflowRunIds = new Set((runsByWorkflow[wf.key] ?? []).map((run) => run.id));
                        const artifact = artifacts.find((a) => a.type === artifactType && a.runId && workflowRunIds.has(a.runId));
                        return { type: artifactType, artifact };
                      });
                      const isComplete = isWorkflowComplete(wf.key);
                      const completeRunValidated = completeRun ? isRunValidated(completeRun) : false;
                      const isCompleteUnvalidated = isComplete && completeRun && !completeRunValidated;
                      const hasUnverifiedResponse = runsByWorkflow[wf.key]?.some(runHasUnverifiedResponse);
                      const showUnvalidated = isCompleteUnvalidated || hasUnverifiedResponse;
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
                                  defaultChecked
                                  form={phaseFormId}
                                  data-phase-workflow={phase.id}
                                  className="h-4 w-4 rounded border-[var(--card-border)] text-teal-600 focus:ring-teal-500"
                                />
                                <p className="font-medium text-[var(--foreground)]">{wf.name}</p>
                              </div>
                              <p className="text-xs text-[var(--muted)]">{getWorkflowSubtitle(wf.key, latestRun?.id, latestRun?.status)}</p>
                              {(WORKFLOW_STEP_LABELS[wf.key]?.length ?? 0) > 1 && (
                                <p className="mt-1 text-xs text-[var(--muted)]/80">
                                  Unterworkflows: {WORKFLOW_STEP_LABELS[wf.key]!.join(" → ")}
                                </p>
                              )}
                              {showUnvalidated && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                  Prüfung ausstehend – Schritte im Run verifizieren
                                </p>
                              )}
                              {locked && (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                  {wf.key === "WF_BUSINESS_PLAN"
                                    ? "Grundlagenanalyse, Warum Unternehmen scheitern, Lieferantenliste und Standortoptionen erforderlich"
                                    : wf.key === "WF_KPI_ESTIMATION"
                                      ? "Grundlagenanalyse, Marktüberblick, Marktanalyse und Businessplan erforderlich"
                                      : ["WF_RESEARCH", "WF_SUPPLIER_LIST", "WF_REAL_ESTATE", "WF_CUSTOMER_VALIDATION", "WF_VALUE_PROPOSITION", "WF_GO_TO_MARKET", "WF_SWOT", "WF_COMPETITOR_ANALYSIS", "WF_STRATEGIC_PLANNING", "WF_TREND_ANALYSIS"].includes(wf.key)
                                        ? "Grundlagenanalyse und Marktüberblick erforderlich"
                                        : wf.key === "WF_NEXT_BEST_ACTIONS"
                                          ? "Grundlagenanalyse, KPI-Set und Marktanalyse erforderlich"
                                          : "Grundlagenanalyse erforderlich"}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {wf.key === "WF_BUSINESS_FORM" && isComplete ? (
                                <Link href="/profile" className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                                  Profil ansehen
                                </Link>
                              ) : hasInProgress ? (
                                <form action={createRunWorkflowAction}>
                                  <input type="hidden" name="workflow_key" value={wf.key} />
                                  <button type="submit" disabled={locked} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                                    Fortsetzen
                                  </button>
                                </form>
                              ) : hasComplete && completeRun ? (
                                <>
                                  <Link href={`/runs/${completeRun.id}`} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                                    Lauf ansehen
                                  </Link>
                                  <form action={createRunWorkflowAction} className="inline">
                                    <input type="hidden" name="workflow_key" value={wf.key} />
                                    <input type="hidden" name="force_new" value="1" />
                                    <button type="submit" disabled={locked} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-teal-50 dark:hover:bg-teal-950/30">
                                      Erneut
                                    </button>
                                  </form>
                                </>
                              ) : (
                                <form action={createRunWorkflowAction}>
                                  <input type="hidden" name="workflow_key" value={wf.key} />
                                  <button type="submit" disabled={locked} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                                    Starten
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                          {wfArtifactItems.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--card-border)] pt-3">
                              {wfArtifactItems.map(({ type, artifact }) =>
                                artifact ? (
                                  <div key={artifact.id} className="inline-flex items-center gap-2">
                                    <Link
                                      href={type === "decision_pack" ? "/decisions" : `/artifacts/${artifact.id}`}
                                      className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-900/50"
                                    >
                                      {getWorkflowArtifactLabel(wf.key, type)} →
                                    </Link>
                                    {hasEarlyWarningSignal(artifact) && (
                                      <EarlyWarningPopover
                                        size="compact"
                                        panelTitle="Warum dieser Hinweis?"
                                        primaryRiskText={getEarlyWarningPrimaryRiskText(artifact)}
                                        detailMessages={getEarlyWarningDetails(artifact)}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <span
                                    key={type}
                                    className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400"
                                  >
                                    {getWorkflowArtifactLabel(wf.key, type)} (fehlt)
                                  </span>
                                )
                              )}
                              {wf.key === "WF_NEXT_BEST_ACTIONS" && decisions.length > 0 && (
                                <Link href="/decisions" className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-xs font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200 dark:hover:bg-teal-900/50">
                                  Top Decisions →
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
                  <p className="text-sm text-[var(--muted)]">Noch keine Prozesse für diese Phase.</p>
                )}
                {(phaseArtifacts.length > 0 || decisionPackInPhase) && (
                  <PhaseArtifactsReleaseBlock
                    phaseId={phase.id}
                    phaseName={phase.name}
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
                        <div key={artifact.id} className="inline-flex items-center gap-2">
                          <Link
                            href={`/artifacts/${artifact.id}`}
                            className="rounded-lg border border-teal-200/70 bg-teal-100/50 px-3 py-2 text-sm font-medium text-teal-900/80 grayscale-[0.2] transition hover:border-teal-300 hover:bg-teal-100/70 dark:border-teal-800/70 dark:bg-teal-950/35 dark:text-teal-100/80 dark:hover:border-teal-700 dark:hover:bg-teal-950/45"
                          >
                            Dokument: {artifact.title || ARTIFACT_LABELS[type] || type}
                          </Link>
                          {hasEarlyWarningSignal(artifact) && (
                            <EarlyWarningPopover
                              size="compact"
                              panelTitle="Warum dieser Hinweis?"
                              primaryRiskText={getEarlyWarningPrimaryRiskText(artifact)}
                              detailMessages={getEarlyWarningDetails(artifact)}
                            />
                          )}
                        </div>
                      ))}
                      {decisionPackInPhase && (
                        <Link href="/decisions" className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium transition hover:border-teal-300 hover:shadow dark:hover:border-teal-700">
                          Top Decisions
                        </Link>
                      )}
                    </>
                  </PhaseArtifactsReleaseBlock>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!assistantPhaseId && (
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
    </div>
  );
}
