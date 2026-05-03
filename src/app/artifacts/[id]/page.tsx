import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { AdvancedJson } from "@/components/AdvancedJson";
import { prepareArtifactReportContent, resolveArtifactReportHtml } from "@/lib/artifactReportDocument";
import { KpiQuestionsForm } from "@/components/KpiQuestionsForm";
import { submitKpiAnswersAction, updateArtifactAction } from "@/app/actions";
import { ArtifactEditor } from "@/components/ArtifactEditor";
import { SourcesFooter } from "@/components/SourcesFooter";
import { ArtifactContentMode } from "@/components/ArtifactContentMode";
import { ArtifactReportBody } from "@/components/ArtifactReportBody";
import { getEarlyWarningDetails, getEarlyWarningPrimaryRiskText, hasEarlyWarningSignal } from "@/lib/earlyWarning";
import { EarlyWarningPopover } from "@/components/EarlyWarningPopover";
import { getArtifactDocumentIntroDe } from "@/lib/artifactDocumentIntroDe";
import { getServerLocale } from "@/lib/locale";
import { HistoryBackLink } from "@/components/HistoryBackLink";

export default async function ArtifactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return_to?: string; embed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const hdrs = await headers();
  const embedFrame = hdrs.get("x-app-embed") === "1";
  const returnTo = String(sp.return_to ?? "").trim();
  const isEmbed = sp.embed === "1" || embedFrame;
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const artifact = await prisma.artifact.findUnique({
    where: { id },
  });

  if (!artifact) {
    notFound();
  }

  const content = await prepareArtifactReportContent(artifact);
  const primaryRiskText = getEarlyWarningPrimaryRiskText({ type: artifact.type, title: artifact.title, contentJson: content });
  const artifactType = String(artifact.type);

  const reportHtml = resolveArtifactReportHtml(
    artifact.exportHtml,
    (content ?? {}) as Record<string, unknown>,
    artifactType,
    artifact.title,
  );

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
      <Section
        title={isDe ? "Ihre Antworten" : "Your answers"}
        description={isDe ? "Bearbeiten und speichern, um KPI-Daten zu aktualisieren." : "Edit and save to update KPI data."}
      >
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
        className={isEmbed ? "rounded-none border-0 bg-transparent p-0 shadow-none" : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isEmbed ? (
              <HistoryBackLink
                fallbackHref={returnTo || "/artifacts?embed=1"}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--background)]"
              >
                <span aria-hidden>←</span>
                {isDe ? "Zurück" : "Back"}
              </HistoryBackLink>
            ) : null}
            {hasEarlyWarningSignal(artifact) && (
              <EarlyWarningPopover
                size="default"
                panelTitle="Risiko-Details"
                primaryRiskText={primaryRiskText}
                detailMessages={getEarlyWarningDetails(artifact)}
              />
            )}
            <Link
              href={
                returnTo
                  ? `/artifacts/${artifact.id}/evaluate?return_to=${encodeURIComponent(returnTo)}`
                  : `/artifacts/${artifact.id}/evaluate`
              }
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              {isDe ? "Dokument evaluieren" : "Evaluate document"}
            </Link>
          </div>
        }
      >
        <div className="mb-4 rounded-xl border border-teal-200/90 bg-teal-50/60 p-4 text-sm text-slate-800 dark:border-teal-800/50 dark:bg-teal-950/25 dark:text-slate-100">
          <p className="leading-relaxed">{isDe ? getArtifactDocumentIntroDe(artifact.type) : "This document summarizes the generated artifact in a structured, decision-ready format."}</p>
        </div>
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
              <p className="font-semibold">{isDe ? "Risikofaktor hoch" : "High risk factor"}</p>
              <ul className="mt-1 list-disc pl-5">
                {high.map((h) => (
                  <li key={h.key}>
                    {h.label}: {h.value} ({isDe ? "Schwelle" : "threshold"} {h.threshold})
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
        <ArtifactContentMode
          data={content}
          defaultMode="report"
          documentTitle={artifact.title}
          generatedAtIso={artifact.createdAt.toISOString()}
          pdfFilenameBase={artifact.title || artifact.id}
          artifactId={artifact.id}
          reportSlot={
            <>
              <ArtifactReportBody
                artifactType={artifactType}
                content={content as Record<string, unknown>}
                resolvedHtml={reportHtml}
                locale={locale}
              />
              {((content?.sources_used as string[]) ?? []).length > 0 ? (
                <section className="mt-10 border-t border-slate-200 pt-6">
                  <h3 className="mb-3 text-lg font-semibold text-slate-900">{isDe ? "Quellen" : "Sources"}</h3>
                  <SourcesFooter sources={(content.sources_used as string[]) ?? []} showTitle={false} />
                </section>
              ) : null}
            </>
          }
          locale={locale}
        />
      </Section>

      {kpiAnswersSection}

      {/*{!isEmbed ? (
        <Section title={isDe ? "Erweitert" : "Advanced"} description={isDe ? "Rohdaten (JSON) - nur Anzeige." : "Raw data (JSON) - read only."}>
          <details className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">{isDe ? "Dokument bearbeiten" : "Edit document"}</summary>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {isDe
                ? "Formular für strukturierte Bearbeitung oder Raw JSON. Nach dem Speichern abhängige Workflows ggf. neu starten (siehe Daten-Seite)."
                : "Use the form for structured editing or raw JSON. After saving, restart dependent workflows if needed (see Data page)."}
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
              <Link href="/data" className="text-teal-600 hover:text-teal-700 dark:text-teal-400">{isDe ? "Daten-Seite" : "Data page"}</Link> {isDe ? "- dort alle Dokumente bearbeiten und Workflows neu starten." : "- edit all documents and restart workflows."}
            </p>
          </details>
          <AdvancedJson data={artifact.contentJson} title={isDe ? "Erweitert" : "Advanced"} summary={isDe ? "Rohdaten (JSON)" : "Raw data (JSON)"} />
        </Section>
      ) : null}*/}
    </div>
  );
}
