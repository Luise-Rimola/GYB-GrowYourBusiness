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

export default async function WorkflowOverviewPage() {
  const company = await getOrCreateDemoCompany();
  const progress = await getProgressState(company.id);
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const w = t.workflowOverview;
  const charts = getWorkflowOverviewCharts(locale);

  return (
    <div className="space-y-12">
      <Section title={w.planningFrameworkTitle} description={w.planningFrameworkDesc}>
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 font-semibold text-[var(--foreground)]">{w.planningPhasesHeading}</h3>
            <div className="flex flex-wrap gap-2">
              {PLANNING_PHASES.map((p) => (
                <span key={p.id} className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-[var(--foreground)]">{w.planningAreasHeading}</h3>
            <div className="flex flex-wrap gap-2">
              {PLANNING_AREAS.map((a) => (
                <span key={a.id} className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-sm dark:border-teal-800 dark:bg-teal-950/20">
                  {a.name}
                </span>
              ))}
            </div>
          </div>
          <Link href="/dashboard" className="inline-block text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400">
            {w.dashboardLink}
          </Link>
        </div>
      </Section>

      <Section title={w.planningAreasHeading} description={w.planningAreasDesc}>
        <div className="grid gap-4 md:grid-cols-2">
          {PLANNING_AREAS.map((area) => {
            const areaWorkflows = area.workflowKeys
              .map((k) => WORKFLOW_BY_KEY[k])
              .filter(Boolean) as { key: string; name: string; description: string }[];
            return (
              <div key={area.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
                <h3 className="font-semibold text-[var(--foreground)]">{area.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{area.description}</p>
                {area.horizon && <p className="mt-0.5 text-xs text-[var(--muted)]">Zeithorizont: {area.horizon}</p>}
                {(area.instruments ?? area.examples)?.length ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {area.instruments ? "Instrumente" : "Beispiele"}: {(area.instruments ?? area.examples)!.slice(0, 4).join(", ")}
                    {((area.instruments ?? area.examples)!.length > 4) ? " …" : ""}
                  </p>
                ) : null}
                {areaWorkflows.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {areaWorkflows.map((wf) => (
                      <div
                        key={wf.key}
                        className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2"
                      >
                        <span className="text-sm font-medium">{wf.name}</span>
                        <Link
                          href="/dashboard"
                          className="rounded border px-2 py-1 text-xs transition hover:bg-teal-50 dark:hover:bg-teal-950/30"
                        >
                          In Pläne
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--muted)]">Noch keine Prozesse zugeordnet.</p>
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
