import Link from "next/link";
import { Section } from "@/components/Section";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { ProgressDiagram } from "@/components/ProgressDiagram";
import { getProgressState } from "@/lib/progress";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { PLANNING_PHASES, PLANNING_AREAS } from "@/lib/planningFramework";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { getWorkflowOverviewCharts } from "@/lib/workflowOverviewCharts";
import { WORKFLOW_BY_KEY } from "@/lib/workflows";
import { PhaseRunButtonForm } from "@/components/PhaseRunButtonForm";

export default async function WorkflowOverviewPage() {
  const company = await getOrCreateDemoCompany();
  const progress = await getProgressState(company.id);
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const w = t.workflowOverview;
  const isEn = locale === "en";
  const phaseNamesEn: Record<string, string> = {
    ideation: "Ideation / Concept Phase",
    validation: "Validation Phase",
    launch: "Founding / Launch Phase",
    scaling: "Growth Phase",
    tech_digital: "Technology & Digitalization",
    maturity: "Strategy Phase",
    renewal: "Strategic Options / Exit / Transformation",
  };
  const areaNamesEn: Record<string, string> = {
    strategic: "Strategic planning",
    operative: "Operational planning",
    financial: "Financial planning",
    hr: "HR planning",
    risk: "Risk and scenario planning",
  };
  const areaDescEn: Record<string, string> = {
    strategic: "Long-term company direction",
    operative: "Concrete execution of the strategy",
    financial: "Secures liquidity and growth",
    hr: "Building and developing teams",
    risk: "Preparation for uncertainty",
  };
  const areaExamplesEn: Record<string, string[]> = {
    strategic: ["Market position", "Competitive advantages", "Innovation"],
    operative: ["Annual planning", "Marketing plan", "Sales plan", "Budget planning"],
    financial: ["Liquidity planning", "Budget planning", "Investment planning", "Break-even analysis"],
    hr: ["Hiring plan", "Organizational structure", "Capability development"],
    risk: ["Scenario analysis", "Sensitivity analysis", "Risk matrix"],
  };
  const workflowNamesEn: Record<string, string> = {
    WF_NEXT_BEST_ACTIONS: "Next best actions",
    WF_VALUE_PROPOSITION: "Value proposition & problem-solution fit",
    WF_STRATEGIC_PLANNING: "Strategic planning",
    WF_COMPETITOR_ANALYSIS: "Competitor analysis",
    WF_STRATEGIC_OPTIONS: "Strategic options",
    WF_DATA_COLLECTION_PLAN: "Data collection plan",
    WF_OPERATIVE_PLAN: "Operational plan",
    WF_BUSINESS_PLAN: "Business plan & finance",
    WF_MENU_PRICING: "Menu & price calculation",
    WF_REAL_ESTATE: "Location options",
    WF_FINANCIAL_PLANNING: "Financial planning",
  };
  const charts = getWorkflowOverviewCharts(locale);

  return (
    <div className="space-y-12">
      <Section title={w.planningFrameworkTitle} description={w.planningFrameworkDesc}>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold text-[var(--foreground)]">{w.planningPhasesHeading}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {PLANNING_PHASES.map((p) => {
                const phaseWorkflows = p.workflowKeys
                  .filter((k) => k !== "WF_BUSINESS_FORM")
                  .map((k) => WORKFLOW_BY_KEY[k])
                  .filter(Boolean) as { key: string; name: string; description: string }[];
                const phaseFormId = `overview-phase-run-${p.id}`;
                return (
                  <div key={p.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {isEn ? (phaseNamesEn[p.id] ?? p.name) : p.name}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {phaseWorkflows.length} {isEn ? "workflows" : "Workflows"}
                        </p>
                      </div>
                      {phaseWorkflows.length > 0 ? (
                        <PhaseRunButtonForm
                          formId={phaseFormId}
                          phaseId={p.id}
                          buttonLabel={isEn ? "Run" : "Ausführen"}
                          workflows={phaseWorkflows.map((wf) => ({
                            key: wf.key,
                            name: isEn ? (workflowNamesEn[wf.key] ?? wf.name) : wf.name,
                          }))}
                        />
                      ) : null}
                    </div>
                    <form id={phaseFormId} className="hidden">
                      {phaseWorkflows.map((wf) => (
                        <input key={wf.key} type="checkbox" name="workflow_keys" value={wf.key} defaultChecked readOnly />
                      ))}
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-[var(--foreground)]">{w.planningAreasHeading}</h3>
            <div className="flex flex-wrap gap-2">
              {PLANNING_AREAS.map((a) => (
                <span key={a.id} className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-sm dark:border-teal-800 dark:bg-teal-950/20">
                  {isEn ? (areaNamesEn[a.id] ?? a.name) : a.name}
                </span>
              ))}
            </div>
          </div>
          <Link href="/dashboard" className="inline-block text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400">
            {w.dashboardLink}
          </Link>
        </div>
      </Section>

      <Section title={w.planningAreasHeading} description={w.planningFrameworkDesc}>
        <div className="grid gap-4 md:grid-cols-2">
          {PLANNING_AREAS.map((area) => {
            const areaWorkflows = area.workflowKeys
              .map((k) => WORKFLOW_BY_KEY[k])
              .filter(Boolean) as { key: string; name: string; description: string }[];
            return (
              <div key={area.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h3 className="font-semibold text-[var(--foreground)]">{isEn ? (areaNamesEn[area.id] ?? area.name) : area.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{isEn ? (areaDescEn[area.id] ?? area.description) : area.description}</p>
                {area.horizon && <p className="mt-0.5 text-xs text-[var(--muted)]">{isEn ? "Horizon" : "Zeithorizont"}: {area.horizon}</p>}
                {((isEn ? areaExamplesEn[area.id] : (area.instruments ?? area.examples)) ?? []).length ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {(isEn ? (area.instruments ? "Instruments" : "Examples") : (area.instruments ? "Instrumente" : "Beispiele"))}: {(isEn ? areaExamplesEn[area.id] : (area.instruments ?? area.examples))!.slice(0, 4).join(", ")}
                    {(((isEn ? areaExamplesEn[area.id] : (area.instruments ?? area.examples))!).length > 4) ? " …" : ""}
                  </p>
                ) : null}
                {areaWorkflows.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {areaWorkflows.map((wf) => (
                      <div
                        key={wf.key}
                        className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2"
                      >
                        <span className="text-sm font-medium">{isEn ? (workflowNamesEn[wf.key] ?? wf.name) : wf.name}</span>
                        <Link
                          href="/dashboard"
                          className="rounded border px-2 py-1 text-xs transition hover:bg-teal-50 dark:hover:bg-teal-950/30"
                        >
                          {isEn ? "Open in plans" : "In Pläne"}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--muted)]">{isEn ? "No workflows assigned yet." : "Noch keine Prozesse zugeordnet."}</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={w.progressTitle} description={w.progressDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <ProgressDiagram steps={progress.steps} nextUrl={progress.nextUrl} />
        </div>
      </Section>

      <Section title={w.platformFlowTitle} description={w.platformFlowDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.platform} id="platform-flow" />
        </div>
      </Section>

      <Section title={w.runLifecycleTitle} description={w.runLifecycleDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.runLifecycle} id="run-lifecycle" />
        </div>
      </Section>

      <Section title={w.dsrStudyTitle} description={w.dsrStudyDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.dsrStudy} id="dsr-study-flow" />
        </div>
      </Section>

      <Section title={w.kpiModelTitle} description={w.kpiModelDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.kpiModel} id="kpi-model-flow" />
        </div>
      </Section>

      <Section title={w.earlyWarningTitle} description={w.earlyWarningDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.earlyWarning} id="early-warning-flow" />
        </div>
      </Section>

      <Section title={w.dependenciesTitle} description={w.dependenciesDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.dependencies} id="dependencies" />
        </div>
      </Section>

      <Section title={w.toolFunctionsTitle} description={w.toolFunctionsDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.toolMap} id="tool-function-map" />
        </div>
        <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>{w.toolBullet1}</li>
            <li>{w.toolBullet2}</li>
            <li>{w.toolBullet3}</li>
            <li>{w.toolBullet4}</li>
            <li>{w.toolBullet5}</li>
          </ul>
        </div>
      </Section>

      <Section title={w.riskFactorsTitle} description={w.riskFactorsDesc}>
        <div className="mb-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
          <p className="font-semibold">{w.riskFactorsIntro}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>{w.riskBullet1}</li>
            <li>{w.riskBullet2}</li>
            <li>{w.riskBullet3}</li>
            <li>{w.riskBullet4}</li>
            <li>{w.riskBullet5}</li>
            <li>{w.riskBullet6}</li>
          </ul>
        </div>
      </Section>

      <Section title={w.userManualTitle} description={w.userManualDesc}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <MermaidDiagram chart={charts.userManual} id="user-manual-steps" />
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{w.userManualFootnote}</p>
      </Section>
    </div>
  );
}
