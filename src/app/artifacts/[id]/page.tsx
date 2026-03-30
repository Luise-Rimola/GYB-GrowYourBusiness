import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { AdvancedJson } from "@/components/AdvancedJson";
import { ReadableDataView } from "@/components/ReadableDataView";
import {
  BaselineReportView,
  IndustryResearchReportView,
  MarketSnapshotView,
  MarketResearchView,
  DiagnosticReportView,
  DataCollectionPlanView,
  DecisionPackView,
  BestPracticesView,
  FailureAnalysisView,
  BusinessPlanView,
  MenuCardView,
  SupplierListView,
  MenuCostView,
  MenuPreiskalkulationView,
  RealEstateView,
  FinancialPlanningView,
  PersonnelPlanView,
  WorkProcessesView,
  StartupConsultingGuideView,
  MarketingStrategyView,
} from "@/components/ArtifactReportView";
import { KpiQuestionsForm } from "@/components/KpiQuestionsForm";
import { submitKpiAnswersAction, updateArtifactAction } from "@/app/actions";
import { ArtifactEditor } from "@/components/ArtifactEditor";
import { SourcesFooter } from "@/components/SourcesFooter";
import { getEarlyWarningDetails, getEarlyWarningPrimaryRiskText, hasEarlyWarningSignal } from "@/lib/earlyWarning";
import { EarlyWarningPopover } from "@/components/EarlyWarningPopover";

export default async function ArtifactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artifact = await prisma.artifact.findUnique({
    where: { id },
  });

  if (!artifact) {
    notFound();
  }

  let content = artifact.contentJson as Record<string, unknown>;
  const primaryRiskText = getEarlyWarningPrimaryRiskText({ type: artifact.type, title: artifact.title, contentJson: content });

  // Business Plan: merge latest financial_planning.monthly_projection so updates appear without re-running
  if (artifact.type === "business_plan" && artifact.companyId) {
    const fpArtifact = await prisma.artifact.findFirst({
      where: { companyId: artifact.companyId, type: "financial_planning" },
      orderBy: { createdAt: "desc" },
    });
    const fpContent = fpArtifact?.contentJson as { monthly_projection?: unknown[] } | null;
    if (fpContent?.monthly_projection?.length) {
      content = { ...content, monthly_projection: fpContent.monthly_projection };
    }
  }
  const kpiKeysFromTable =
    content?.kpi_table && Array.isArray(content.kpi_table)
      ? (content.kpi_table as Record<string, unknown>[]).flatMap((r) => Object.keys(r))
      : [];
  const kpiKeysFromIndicators =
    content?.strategy_indicators && typeof content.strategy_indicators === "object" && !Array.isArray(content.strategy_indicators)
      ? Object.keys(content.strategy_indicators as Record<string, unknown>)
      : [];
  const kpiKeysFromImpact =
    content?.kpi_impact_range && typeof content.kpi_impact_range === "object" && !Array.isArray(content.kpi_impact_range)
      ? Object.keys(content.kpi_impact_range as Record<string, unknown>)
      : [];
  const refs = {
    kpi_keys: [...new Set([...kpiKeysFromTable, ...kpiKeysFromIndicators, ...kpiKeysFromImpact])],
    artifact_ids: [artifact.id],
    source_ids: [] as string[],
    knowledge_object_ids: [] as string[],
  };
  const citations = (content?.citations_json as Record<string, string[]>) ?? content?.citations_json;
  if (citations && typeof citations === "object") {
    refs.kpi_keys = [...new Set([...refs.kpi_keys, ...(citations.kpi_keys ?? [])])];
    refs.source_ids = citations.source_ids ?? [];
    refs.knowledge_object_ids = citations.knowledge_object_ids ?? [];
  }

  const reportViewMap: Record<string, ComponentType<{ content: Record<string, unknown> }> | null> = {
    baseline: BaselineReportView,
    industry_research: IndustryResearchReportView,
    market: MarketSnapshotView,
    market_research: MarketResearchView,
    diagnostic: DiagnosticReportView,
    data_collection_plan: DataCollectionPlanView,
    decision_pack: DecisionPackView,
    best_practices: BestPracticesView,
    failure_analysis: FailureAnalysisView,
    business_plan: BusinessPlanView,
    menu_card: MenuCardView,
    supplier_list: SupplierListView,
    menu_cost: MenuCostView,
    menu_preiskalkulation: MenuPreiskalkulationView,
    real_estate: RealEstateView,
    financial_planning: FinancialPlanningView,
    personnel_plan: PersonnelPlanView,
    work_processes: WorkProcessesView,
    startup_guide: StartupConsultingGuideView,
    marketing_strategy: MarketingStrategyView,
    knowledge_digest: null,
    strategy_pack: null,
  };
  const ReportView = reportViewMap[artifact.type] ?? null;

  // For data_collection_plan with runId: fetch answers and show editable form
  let kpiAnswersSection: ReactNode = null;
  if (artifact.type === "data_collection_plan" && artifact.runId) {
    const run = await prisma.run.findUnique({
      where: { id: artifact.runId },
      include: { steps: true },
    });
    const answersStep = run?.steps.find((s) => s.stepKey === "kpi_questions_answer");
    const plan = content as { questions_simple?: string[]; mapping_to_kpi_keys?: string[]; default_estimates_if_unknown?: string[] };
    const existingAnswers = (answersStep?.parsedOutputJson as { answers?: string[] } | null)?.answers ?? [];
    kpiAnswersSection = (
      <Section title="Your answers" description="Edit and save to update KPI data.">
        <KpiQuestionsForm
          plan={{
            questions_simple: plan.questions_simple ?? [],
            mapping_to_kpi_keys: plan.mapping_to_kpi_keys ?? [],
            default_estimates_if_unknown: plan.default_estimates_if_unknown ?? [],
          }}
          existingAnswers={existingAnswers}
          submitAction={submitKpiAnswersAction}
          hiddenFields={{
            run_id: artifact.runId,
            redirect_to: `/artifacts/${artifact.id}`,
          }}
        />
      </Section>
    );
  }

  return (
    <div className="space-y-8">
      <Section
        title={artifact.title}
        description={`${artifact.type} · v${artifact.version}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {hasEarlyWarningSignal(artifact) && (
              <EarlyWarningPopover
                size="default"
                panelTitle="Risiko-Details"
                primaryRiskText={primaryRiskText}
                detailMessages={getEarlyWarningDetails(artifact)}
              />
            )}
            <Link
              href={`/artifacts/${artifact.id}/evaluate`}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              Dokument evaluieren
            </Link>
            {artifact.runId ? (
              <Link
                href={`/runs/${artifact.runId}`}
                className="rounded-xl border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
              >
                View Run Audit →
              </Link>
            ) : null}
          </div>
        }
      >
        {(() => {
          const si = content.strategy_indicators as Record<string, { value?: number | string }> | undefined;
          const riskKeys: Array<{ key: string; threshold: number; label: string }> = [
            { key: "risk_exposure_score", threshold: 70, label: "Risk Exposure" },
            { key: "threat_score", threshold: 70, label: "Threat" },
            { key: "weakness_score", threshold: 70, label: "Weakness" },
            { key: "competitive_intensity_index", threshold: 75, label: "Competitive Intensity" },
          ];
          const high = riskKeys
            .map((rk) => {
              const raw = si?.[rk.key]?.value;
              const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(",", ".")) : NaN;
              return Number.isFinite(num) && num >= rk.threshold ? { ...rk, value: num } : null;
            })
            .filter((v): v is { key: string; threshold: number; label: string; value: number } => v !== null);
          if (high.length === 0) return null;
          return (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-100">
              <p className="font-semibold">Risikofaktor hoch</p>
              <ul className="mt-1 list-disc pl-5">
                {high.map((h) => (
                  <li key={h.key}>
                    {h.label}: {h.value} (Schwelle {h.threshold})
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
        {ReportView ? (
          <ReportView content={content} />
        ) : (
          <div
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm"
            dangerouslySetInnerHTML={{
              __html: artifact.exportHtml ?? "<em>No content</em>",
            }}
          />
        )}
      </Section>

      {((content?.sources_used as string[]) ?? []).length > 0 && (
        <Section title="Quellen" description="Nummerierte Quellen – bei Bedarf aufrufbar.">
          <SourcesFooter sources={(content.sources_used as string[]) ?? []} showTitle={false} />
        </Section>
      )}

      {kpiAnswersSection}

      <Section
        title="Vollständige Felder (strukturiert)"
        description="Alle im Dokument gespeicherten Felder in strukturierter Darstellung."
      >
        <ReadableDataView
          data={content}
          collapsible={false}
        />
      </Section>

      <Section title="References" description="KPIs, sources, and KB objects used.">
        <div className="space-y-2 text-sm">
          {refs.kpi_keys.length > 0 && <p><span className="font-semibold">KPIs:</span> {refs.kpi_keys.join(", ")}</p>}
          {refs.source_ids.length > 0 && <p><span className="font-semibold">Sources:</span> {refs.source_ids.join(", ")}</p>}
          {refs.knowledge_object_ids.length > 0 && <p><span className="font-semibold">KB Objects:</span> {refs.knowledge_object_ids.join(", ")}</p>}
          {refs.kpi_keys.length === 0 && refs.source_ids.length === 0 && refs.knowledge_object_ids.length === 0 && (
            <p className="text-[var(--muted)]">No references extracted.</p>
          )}
        </div>
      </Section>

      <Section title="Advanced" description="Rohdaten (JSON) – nur Anzeige.">
        <details className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Dokument bearbeiten</summary>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Formular für strukturierte Bearbeitung oder Raw JSON. Nach dem Speichern abhängige Workflows ggf. neu starten (siehe Daten-Seite).
          </p>
          <div className="mt-4">
            <ArtifactEditor
              artifactType={artifact.type}
              content={(artifact.contentJson ?? {}) as Record<string, unknown>}
              submitAction={updateArtifactAction}
              artifactId={artifact.id}
              redirectTo={`/artifacts/${artifact.id}`}
            />
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            <Link href="/data" className="text-teal-600 hover:text-teal-700 dark:text-teal-400">Daten-Seite</Link> – dort alle Dokumente bearbeiten und Workflows neu starten.
          </p>
        </details>
        <AdvancedJson data={artifact.contentJson} title="Advanced" summary="Rohdaten (JSON)" />
      </Section>
    </div>
  );
}
