import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { ReadableDataView } from "@/components/ReadableDataView";
import { KpiLibraryCards } from "@/components/KpiLibraryCards";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { AutoKpiService } from "@/services/autoKpi";
import { getLatestStrategyIndicatorValues } from "@/lib/strategyIndicatorValues";
import { IntegratedInsightAnalysis } from "@/components/IntegratedInsightAnalysis";
import { InsightsKpiExpandAll } from "@/components/InsightsKpiExpandAll";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { getArtifactEvaluationsByCompany } from "@/lib/artifactEvaluations";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const [kpiValues, kpiSet, library, kpiEstimationArtifact, latestKpiSetStep, strategyIndicators, latestIndicatorValues, recentArtifacts, recentRuns, nextDecisions, artifactEvals, latestUspArtifact] = await Promise.all([
    prisma.kpiValue.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
    prisma.companyKpiSet.findFirst({ where: { companyId: company.id }, orderBy: { version: "desc" } }),
    prisma.kpiLibrary.findMany(),
    prisma.artifact.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }).then((arts) => arts.find((a) => String(a.type) === "kpi_estimation") ?? null).catch(() => null),
    prisma.runStep.findFirst({
      where: { run: { companyId: company.id }, stepKey: "kpi_set_selection" },
      orderBy: { createdAt: "desc" },
      select: { parsedOutputJson: true },
    }),
    prisma.strategyIndicator.findMany({ orderBy: { indicatorKey: "asc" } }),
    getLatestStrategyIndicatorValues(company.id).catch(() => ({})),
    prisma.artifact.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, title: true, type: true, createdAt: true },
    }),
    prisma.run.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { workflowKey: true, status: true, createdAt: true },
    }),
    prisma.decision.findMany({
      where: { companyId: company.id, status: { in: ["proposed", "approved"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, status: true, dueDate: true },
    }),
    getArtifactEvaluationsByCompany(company.id).catch(() => []),
    prisma.artifact.findFirst({
      where: { companyId: company.id, type: "value_proposition" },
      orderBy: { createdAt: "desc" },
      select: { contentJson: true },
    }),
  ]);

  const indicatorValueByKey = latestIndicatorValues as Record<string, number>;
  const isEn = locale === "en";
  const indicatorNameEn: Record<string, string> = {
    competitive_intensity_index: "Competitive intensity",
    differentiation_score: "Differentiation",
    evidence_confidence_score: "Evidence confidence",
    execution_feasibility_score: "Execution feasibility",
    gtm_readiness_score: "Go-to-market readiness",
    market_attractiveness_score: "Market attractiveness",
    opportunity_score: "Opportunity score",
    pricing_power_index: "Pricing power",
    risk_exposure_score: "Risk exposure",
    strategic_fit_score: "Strategic fit",
    strength_score: "Strength score",
    threat_score: "Threat score",
    weakness_score: "Weakness score",
  };

  const fromKpiSet = (kpiSet?.selectedKpisJson as string[] | null) ?? [];
  const fromRun = (latestKpiSetStep?.parsedOutputJson as { selected_kpis?: string[] } | null)?.selected_kpis ?? [];
  const selectedKpis = [...new Set([...fromRun, ...fromKpiSet])];
  const effectiveSelected =
    selectedKpis.length > 0
      ? selectedKpis
      : (await AutoKpiService.selectKpiSet(company.id, company.inferredBusinessModelType ?? "mixed")).selected_kpis;
  const estimationContent = kpiEstimationArtifact?.contentJson as { kpi_estimates?: Array<{ kpi_key: string; value: number | string; unit?: string; confidence?: number }> } | null;
  const kpiEstimates = estimationContent?.kpi_estimates ?? [];
  const selectedSet = new Set(effectiveSelected.map((s) => s.toLowerCase().replace(/-/g, "_")));
  const selectedLibrary = library.filter((kpi) => selectedSet.has(kpi.kpiKey.toLowerCase().replace(/-/g, "_")));
  const estimateSet = new Set(kpiEstimates.map((e) => e.kpi_key.toLowerCase().replace(/-/g, "_")));
  const estimatedLibrary = library.filter((kpi) => {
    const k = kpi.kpiKey.toLowerCase().replace(/-/g, "_");
    return estimateSet.has(k) || Array.from(estimateSet).some((ek) => ek.includes(k) || k.includes(ek));
  });
  const libraryByDomain = Array.from(
    library.reduce((acc, kpi) => {
      const domain = kpi.domain || "General";
      if (!acc.has(domain)) acc.set(domain, []);
      acc.get(domain)!.push(kpi);
      return acc;
    }, new Map<string, typeof library>())
  ).sort(([a], [b]) => a.localeCompare(b));
  const kpiTree = kpiSet?.kpiTreeJson ?? { north_star: null, drivers: {} };
  const insightLocale = locale === "en" ? "en" : "de";
  const activeTab = params.tab === "kpi" ? "kpi" : "dashboard";
  const selectedCount = selectedLibrary.length;
  const availableCount = library.length;
  const estimatedCount = estimatedLibrary.length;
  const valueCount = kpiValues.length;
  const selectionRate = availableCount > 0 ? Math.round((selectedCount / availableCount) * 100) : 0;
  const estimateRate = selectedCount > 0 ? Math.round((estimatedCount / selectedCount) * 100) : 0;
  const uniqueDomains = new Set(library.map((k) => k.domain || "General")).size;
  const topDomains = libraryByDomain
    .map(([domain, domainKpis]) => ({ domain, count: domainKpis.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const latestKpiByKey = new Map<string, (typeof kpiValues)[number]>();
  for (const v of kpiValues) {
    if (!latestKpiByKey.has(v.kpiKey)) latestKpiByKey.set(v.kpiKey, v);
  }
  const topKpiValues = Array.from(latestKpiByKey.values())
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6);
  const trendKpiKey = topKpiValues[0]?.kpiKey ?? kpiValues[0]?.kpiKey ?? null;
  const trendValues = trendKpiKey
    ? kpiValues
        .filter((v) => v.kpiKey === trendKpiKey)
        .slice(0, 8)
        .reverse()
    : [];
  const maxTrend = Math.max(1, ...trendValues.map((v) => Math.abs(v.value)));
  const currentPhase = (() => {
    const inProgress = recentRuns.find((r) => ["draft", "running", "incomplete"].includes(r.status));
    const fallback = recentRuns[0];
    const key = inProgress?.workflowKey ?? fallback?.workflowKey;
    const phase = PLANNING_PHASES.find((p) => p.workflowKeys.includes(key ?? ""));
    return phase ?? PLANNING_PHASES[0];
  })();
  const warningArtifactIds = new Set(
    artifactEvals
      .filter((e) => e.hallucinationPresent || (e.ew_sensible != null && e.ew_sensible <= 2) || (e.ew_helpful != null && e.ew_helpful <= 2))
      .map((e) => e.artifactId)
  );
  const warningDocs = recentArtifacts.filter((a) => warningArtifactIds.has(a.id)).slice(0, 5);
  const completedRuns = recentRuns.filter((r) => ["complete", "approved"].includes(r.status)).length;
  const runProgress = recentRuns.length > 0 ? Math.round((completedRuns / recentRuns.length) * 100) : 0;
  const uspRaw = latestUspArtifact?.contentJson;
  const uspContent = (() => {
    if (!uspRaw) return {} as Record<string, unknown>;
    if (typeof uspRaw === "string") {
      try {
        return JSON.parse(uspRaw) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    }
    return uspRaw as Record<string, unknown>;
  })();
  const nestedOutput =
    (uspContent.output as Record<string, unknown> | undefined) ??
    (uspContent.result as Record<string, unknown> | undefined) ??
    (uspContent.response as Record<string, unknown> | undefined) ??
    null;
  const pick = (obj: Record<string, unknown> | null | undefined, key: string) =>
    obj && typeof obj[key] === "string" ? String(obj[key]).trim() : "";
  const uspText =
    pick(uspContent, "unique_value_proposition") ||
    pick(uspContent, "value_proposition") ||
    pick(uspContent, "usp") ||
    pick(nestedOutput, "unique_value_proposition") ||
    pick(nestedOutput, "value_proposition") ||
    pick(nestedOutput, "usp");
  const kpiValuesByKey = new Map<string, Array<(typeof kpiValues)[number]>>();
  for (const row of kpiValues) {
    if (!kpiValuesByKey.has(row.kpiKey)) kpiValuesByKey.set(row.kpiKey, []);
    kpiValuesByKey.get(row.kpiKey)!.push(row);
  }
  const topKpiTableRows = Array.from(kpiValuesByKey.entries())
    .map(([kpiKey, rows]) => {
      const ordered = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const latest = ordered[0];
      const prev = ordered[1];
      const trend: "up" | "down" | "flat" = !prev ? "flat" : latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat";
      return { kpiKey, latest: latest.value, trend, updatedAt: latest.createdAt };
    })
    .sort((a, b) => Math.abs(b.latest) - Math.abs(a.latest))
    .slice(0, 4);
  const primaryKpi = topKpiTableRows[0] ?? null;
  const primaryKpiHistory = primaryKpi ? (kpiValuesByKey.get(primaryKpi.kpiKey) ?? []).slice(0, 2) : [];
  const primaryDeltaPct =
    primaryKpiHistory.length >= 2 && Number(primaryKpiHistory[1].value) !== 0
      ? Math.round(((Number(primaryKpiHistory[0].value) - Number(primaryKpiHistory[1].value)) / Math.abs(Number(primaryKpiHistory[1].value))) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="grid w-full grid-cols-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)]/80 p-1 shadow-sm">
        <Link
          href="/insights?tab=dashboard"
          prefetch={false}
          className={`rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
            activeTab === "dashboard"
              ? "border border-[var(--card-border)] bg-[var(--background)] text-teal-700 shadow-sm dark:text-teal-300"
              : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/insights?tab=kpi"
          prefetch={false}
          className={`rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
            activeTab === "kpi"
              ? "border border-[var(--card-border)] bg-[var(--background)] text-teal-700 shadow-sm dark:text-teal-300"
              : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
          }`}
        >
          KPI
        </Link>
      </div>

      {activeTab === "dashboard" && (
        <Section
          title={isEn ? "Business Dashboard" : "Business-Dashboard"}
          description={isEn ? "Current phase, important KPI values, documents, warning signals and next best actions." : "Aktuelle Phase, wichtige KPI-Werte, Dokumente, Warnsignale und nächste Maßnahmen."}
        >
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
              <Link
                href="/assistant?start=1"
                prefetch={false}
                className="inline-flex h-fit items-center justify-center rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 hover:shadow-teal-500/30"
              >
                {t.home.startAssistant}
              </Link>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
                <p className="text-xs font-medium text-[var(--muted)]">{isEn ? "Current phase" : "Aktuelle Phase"}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{isEn ? currentPhase.name : currentPhase.name}</p>
                <p className="text-xs text-[var(--muted)]">{isEn ? "currently being processed" : "wird aktuell bearbeitet"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
              <p className="text-xs font-medium text-[var(--muted)]">USP</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">
                {uspText || (isEn ? "No USP response generated yet." : "Noch keine USP-Response erzeugt.")}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Most important KPI graph" : "Graph: wichtigster KPI"} <span className="ml-1 text-[var(--muted)]">📈</span></p>
                <p className="mt-1 text-xs text-[var(--muted)]">{trendKpiKey ?? "—"}</p>
                <div className="mt-3 flex h-40 items-end gap-2">
                  {trendValues.length === 0 ? (
                    <div className="flex h-full w-full items-end gap-2">
                      <div className="w-8 rounded-t bg-teal-200/80 dark:bg-teal-900/40" style={{ height: "28%" }} />
                      <div className="w-8 rounded-t bg-cyan-200/80 dark:bg-cyan-900/40" style={{ height: "42%" }} />
                      <div className="w-8 rounded-t bg-violet-200/80 dark:bg-violet-900/40" style={{ height: "36%" }} />
                      <div className="w-8 rounded-t bg-emerald-200/80 dark:bg-emerald-900/40" style={{ height: "52%" }} />
                      <div className="w-8 rounded-t bg-amber-200/80 dark:bg-amber-900/40" style={{ height: "40%" }} />
                      <div className="w-8 rounded-t bg-rose-200/80 dark:bg-rose-900/40" style={{ height: "60%" }} />
                    </div>
                  ) : trendValues.map((v, idx) => {
                    const pct = Math.max(6, Math.round((Math.abs(v.value) / maxTrend) * 100));
                    return <div key={`${v.kpiKey}-${idx}`} className="w-8 rounded-t bg-teal-500/80" style={{ height: `${pct}%` }} title={`${v.value}`} />;
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">{trendValues.length === 0 ? (isEn ? "Demo preview until values exist." : "Demo-Vorschau bis Werte vorliegen.") : (isEn ? "latest 8 values" : "letzte 8 Werte")}</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Latest created documents" : "Zuletzt erstellte Dokumente"}</p>
                  <div className="mt-3 space-y-2">
                    {recentArtifacts.slice(0, 6).map((a) => (
                      <Link key={a.id} href={`/artifacts/${a.id}`} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm hover:border-teal-300 dark:hover:border-teal-700">
                        <span className="truncate font-medium text-[var(--foreground)]">{a.title}</span>
                        <span className="ml-3 shrink-0 text-xs text-[var(--muted)]">{new Date(a.createdAt).toLocaleDateString(isEn ? "en-US" : "de-DE")}</span>
                      </Link>
                    ))}
                    {recentArtifacts.length === 0 && (
                      <div className="space-y-2">
                        <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                        <div className="h-3 w-10/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                        <div className="h-3 w-9/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Documents with warning signals" : "Dokumente mit Warnsignalen"}</p>
                  <div className="mt-3 space-y-2">
                    {warningDocs.slice(0, 5).map((a) => (
                      <Link key={a.id} href={`/artifacts/${a.id}`} className="block truncate rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        {a.title}
                      </Link>
                    ))}
                    {warningDocs.length === 0 && (
                      <div className="space-y-2">
                        <div className="h-3 w-10/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                        <div className="h-3 w-8/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Top 4 KPIs" : "Top 4 KPIs"}</p>
                  <span className="text-xs text-[var(--muted)]">{isEn ? "Live" : "Live"}</span>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)] text-left text-xs text-[var(--muted)]">
                        <th className="py-2">{isEn ? "KPI" : "KPI"}</th>
                        <th className="py-2">{isEn ? "Value" : "Wert"}</th>
                        <th className="py-2">{isEn ? "Updated" : "Aktualisiert"}</th>
                        <th className="py-2">{isEn ? "Trend" : "Trend"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topKpiTableRows.map((row) => (
                        <tr key={row.kpiKey} className="border-b border-[var(--card-border)]/60">
                          <td className="py-2 font-medium text-[var(--foreground)]">{row.kpiKey}</td>
                          <td className="py-2 text-[var(--foreground)]">{row.latest}</td>
                          <td className="py-2 text-xs text-[var(--muted)]">{row.updatedAt.toLocaleDateString(isEn ? "en-US" : "de-DE")}</td>
                          <td className="py-2">
                            <span className={row.trend === "up" ? "text-emerald-600" : row.trend === "down" ? "text-rose-600" : "text-[var(--muted)]"}>
                              {row.trend === "up" ? "▲" : row.trend === "down" ? "▼" : "•"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {topKpiTableRows.length === 0 && (
                        <tr>
                          <td className="py-3" colSpan={4}>
                            <div className="space-y-2">
                              <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                              <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Next 3 steps" : "Nächste 3 Schritte"} <span className="ml-1 text-[var(--muted)]">✓</span></p>
                <div className="mt-3 space-y-2">
                  {nextDecisions.slice(0, 3).map((d, idx) => (
                    <Link key={d.id} href="/decisions" className="block rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 text-sm hover:border-teal-300 dark:hover:border-teal-700">
                      <div className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-teal-500" />
                        <div className="min-w-0">
                          <p className="text-xs text-[var(--muted)]">{isEn ? "Task" : "Task"} {idx + 1}</p>
                          <p className="line-clamp-2 font-medium text-[var(--foreground)]">{d.title}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {nextDecisions.length === 0 && (
                    <div className="space-y-2">
                      <div className="h-10 animate-pulse rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60" />
                      <div className="h-10 animate-pulse rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60" />
                      <div className="h-10 animate-pulse rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60" />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/40 p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{isEn ? "Quick actions" : "Schnellaktionen"}</p>
                <div className="mt-3 grid gap-2">
                  <Link href="/dashboard?view=execution" className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:border-teal-300 dark:hover:border-teal-700">
                    {isEn ? "Open process execution" : "Prozess-Ausführung öffnen"}
                  </Link>
                  <Link href="/artifacts" className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:border-teal-300 dark:hover:border-teal-700">
                    {isEn ? "Open all documents" : "Alle Dokumente öffnen"}
                  </Link>
                  <Link href="/decisions" className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:border-teal-300 dark:hover:border-teal-700">
                    {isEn ? "Open decisions" : "Maßnahmen öffnen"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {activeTab === "kpi" && (
      <Section title={t.insights.integratedTitle} description={t.insights.integratedDesc}>
        <IntegratedInsightAnalysis
          locale={insightLocale}
          labels={{
            button: t.insights.integratedButton,
            loading: t.insights.integratedLoading,
          }}
        />
      </Section>
      )}

      {activeTab === "kpi" && (
      <Section
        title={t.insights.kpiLibrary}
        description={t.insights.kpiLibraryDesc}
        actions={
          <Link href="/data" className="text-sm font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400">
            {t.insights.editKpiSelection}
          </Link>
        }
      >
        {library.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.insights.noKpiLibrary}
          </p>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{isEn ? "1) Selected by AI" : "1) Von der KI ausgewählt"}</h3>
              {selectedLibrary.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{isEn ? "No AI selection available yet." : "Noch keine KI-Auswahl vorhanden."}</p>
              ) : (
                <KpiLibraryCards
                  library={selectedLibrary}
                  kpiValues={kpiValues.map((kv) => ({
                    kpiKey: kv.kpiKey,
                    value: String(kv.value),
                    periodEnd: kv.periodEnd,
                  }))}
                  kpiEstimates={kpiEstimates}
                  showEstimatesSection={false}
                  locale={locale}
                  t={{
                    infoDescription: t.insights.infoDescription,
                    infoCalculationMethod: t.insights.infoCalculationMethod,
                    infoStandsFor: t.insights.infoStandsFor,
                    estimateLabel: t.insights.estimateLabel,
                    estimatesSubheading: t.insights.estimatesSubheading,
                  }}
                />
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{isEn ? "2) All available KPIs" : "2) Alle verfügbaren KPIs"}</h3>
              <InsightsKpiExpandAll
                openAllLabel={t.insights.openAllKpis}
                closeAllLabel={t.insights.closeAllKpis}
              >
                <div className="space-y-3">
                  {libraryByDomain.map(([domain, domainKpis]) => {
                    return (
                      <details key={domain} className="group rounded-none border border-[var(--card-border)] bg-[var(--background)]/30 p-3">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--foreground)]">
                          {domain} ({domainKpis.length})
                        </summary>
                        <div className="mt-3">
                          <KpiLibraryCards
                            library={domainKpis}
                            kpiValues={kpiValues.map((kv) => ({
                              kpiKey: kv.kpiKey,
                              value: String(kv.value),
                              periodEnd: kv.periodEnd,
                            }))}
                            kpiEstimates={kpiEstimates}
                            showEstimatesSection={false}
                            locale={locale}
                            t={{
                              infoDescription: t.insights.infoDescription,
                              infoCalculationMethod: t.insights.infoCalculationMethod,
                              infoStandsFor: t.insights.infoStandsFor,
                              estimateLabel: t.insights.estimateLabel,
                              estimatesSubheading: t.insights.estimatesSubheading,
                            }}
                          />
                        </div>
                      </details>
                    );
                  })}
                </div>
              </InsightsKpiExpandAll>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">{isEn ? "3) KPIs with AI-calculated value" : "3) KPIs mit KI-berechnetem Wert"}</h3>
              {estimatedLibrary.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{isEn ? "No AI calculations available yet." : "Noch keine KI-Berechnungen vorhanden."}</p>
              ) : (
                <KpiLibraryCards
                  library={estimatedLibrary}
                  kpiValues={[]}
                  kpiEstimates={kpiEstimates}
                  showEstimatesSection={true}
                  locale={locale}
                  t={{
                    infoDescription: t.insights.infoDescription,
                    infoCalculationMethod: t.insights.infoCalculationMethod,
                    infoStandsFor: t.insights.infoStandsFor,
                    estimateLabel: t.insights.estimateLabel,
                    estimatesSubheading: t.insights.estimatesSubheading,
                  }}
                />
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">4) Strategy Indicators</h3>
              {strategyIndicators.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Keine Strategy Indicators vorhanden.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                        <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Key</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Framework</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Scale</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">{isEn ? "Latest value" : "Letzter Wert"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategyIndicators.map((it) => (
                        <tr key={it.id} className="border-b border-[var(--card-border)]/60">
                          <td className="px-3 py-2 text-[var(--muted)]">{it.indicatorKey}</td>
                          <td className="px-3 py-2 text-[var(--foreground)]">{isEn ? (indicatorNameEn[it.indicatorKey] ?? it.nameSimple) : it.nameSimple}</td>
                          <td className="px-3 py-2 text-[var(--muted)]">{it.frameworkOrigin}</td>
                          <td className="px-3 py-2 text-[var(--muted)]">{it.scale}</td>
                          <td className="px-3 py-2 text-[var(--foreground)]">
                            {indicatorValueByKey[it.indicatorKey] != null ? String(indicatorValueByKey[it.indicatorKey]) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </Section>
      )}

      {activeTab === "kpi" && (
      <Section title={t.insights.kpiTree}>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <ReadableDataView data={kpiTree} summary={t.data.viewData} />
        </div>
      </Section>
      )}
    </div>
  );
}

