import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { ReadableDataView } from "@/components/ReadableDataView";
import { KpiValueCards } from "@/components/KpiValueCards";
import { KpiLibraryCards } from "@/components/KpiLibraryCards";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { AutoKpiService } from "@/services/autoKpi";
import { getLatestStrategyIndicatorValues } from "@/lib/strategyIndicatorValues";
import { getActiveIndicatorRuleAlerts } from "@/lib/indicatorMappingRulesEngine";

export default async function InsightsPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const [kpiValues, kpiSet, library, baselineArtifact, kpiEstimationArtifact, latestKpiSetStep, strategyIndicators, indicatorMappingRules, latestIndicatorValues, activeRuleAlerts] = await Promise.all([
    prisma.kpiValue.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
    prisma.companyKpiSet.findFirst({ where: { companyId: company.id }, orderBy: { version: "desc" } }),
    prisma.kpiLibrary.findMany(),
    prisma.artifact.findFirst({
      where: { companyId: company.id, type: "baseline" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.artifact.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }).then((arts) => arts.find((a) => String(a.type) === "kpi_estimation") ?? null).catch(() => null),
    prisma.runStep.findFirst({
      where: { run: { companyId: company.id }, stepKey: "kpi_set_selection" },
      orderBy: { createdAt: "desc" },
      select: { parsedOutputJson: true },
    }),
    prisma.strategyIndicator.findMany({ orderBy: { indicatorKey: "asc" } }),
    prisma.indicatorMappingRule.findMany({ orderBy: { ruleKey: "asc" } }),
    getLatestStrategyIndicatorValues(company.id).catch(() => ({})),
    getActiveIndicatorRuleAlerts(company.id).catch(() => []),
  ]);

  const indicatorValueByKey = latestIndicatorValues as Record<string, number>;

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
  const gapContent = baselineArtifact?.contentJson as { kpi_table?: Array<Record<string, unknown>>; top_gaps?: unknown[] } | null;
  const kpiTable = gapContent?.kpi_table ?? [];
  const topGaps = gapContent?.top_gaps ?? [];
  const normalizedTopGaps = topGaps
    .map((gap, idx) => {
      if (!gap || typeof gap !== "object") return null;
      const g = gap as Record<string, unknown>;
      const rank = typeof g.gap_rank === "number" ? g.gap_rank : idx + 1;
      const key = typeof g.gap_key === "string" ? g.gap_key : `gap_${idx + 1}`;
      const description = typeof g.description === "string" ? g.description : "Keine Beschreibung vorhanden.";
      const blockedKpis = Array.isArray(g.blocked_kpis) ? g.blocked_kpis.map((v) => String(v)) : [];
      const minimalDataToFix = Array.isArray(g.minimal_data_to_fix) ? g.minimal_data_to_fix.map((v) => String(v)) : [];
      return { rank, key, description, blockedKpis, minimalDataToFix };
    })
    .filter((v): v is { rank: number; key: string; description: string; blockedKpis: string[]; minimalDataToFix: string[] } => v !== null);

  return (
    <div className="space-y-8">
      <Section
        title={t.insights.title}
        description={t.insights.description}
      >
        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t.insights.kpiTree}</p>
          <ReadableDataView data={kpiTree} summary={t.data.viewData} />
        </div>

        {kpiValues.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.insights.noKpiValues}
          </p>
        ) : (
          <KpiValueCards
            kpiValues={kpiValues.map((kv) => ({ ...kv, sourceRefJson: (kv.sourceRefJson ?? {}) as object }))}
            library={library}
            kpiEstimates={kpiEstimates}
            t={{
              viewDetails: t.insights.viewDetails,
              formula: t.insights.formula,
              sourceTrace: t.insights.sourceTrace,
              confidenceLabel: t.insights.confidenceLabel,
              manualLabel: t.insights.manualLabel,
              estimateLabel: t.insights.estimateLabel,
              viewHistory: "Verlauf anzeigen",
            }}
          />
        )}
      </Section>

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
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">1) Alle verfügbaren KPIs</h3>
              <div className="space-y-3">
                {libraryByDomain.map(([domain, domainKpis]) => {
                  return (
                    <details key={domain} className="group rounded-xl border border-[var(--card-border)] bg-[var(--background)]/30 p-3">
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
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">2) Von der KI ausgewählt</h3>
              {selectedLibrary.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Noch keine KI-Auswahl vorhanden.</p>
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
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">3) KPIs mit KI-berechnetem Wert</h3>
              {estimatedLibrary.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Noch keine KI-Berechnungen vorhanden.</p>
              ) : (
                <KpiLibraryCards
                  library={estimatedLibrary}
                  kpiValues={[]}
                  kpiEstimates={kpiEstimates}
                  showEstimatesSection={true}
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
                        <th className="px-3 py-2 text-left font-semibold text-[var(--foreground)]">Letzter Wert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategyIndicators.map((it) => (
                        <tr key={it.id} className="border-b border-[var(--card-border)]/60">
                          <td className="px-3 py-2 text-[var(--muted)]">{it.indicatorKey}</td>
                          <td className="px-3 py-2 text-[var(--foreground)]">{it.nameSimple}</td>
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

            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">5) Indicator Mapping Rules</h3>
              {activeRuleAlerts.length > 0 && (
                <div className="mb-3 rounded-xl border border-amber-300/70 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-semibold">Aktive Rule-Hinweise ({activeRuleAlerts.length})</p>
                  <ul className="mt-1 space-y-1">
                    {activeRuleAlerts.slice(0, 5).map((a) => (
                      <li key={a.ruleKey}>
                        <span className="font-medium">{a.ruleKey}</span>
                        {a.message ? ` - ${a.message}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {indicatorMappingRules.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Keine Mapping Rules vorhanden.</p>
              ) : (
                <div className="space-y-2">
                  {indicatorMappingRules.map((rule) => (
                    <details key={rule.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/20 p-3">
                      <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">
                        {rule.ruleKey}
                        {activeRuleAlerts.some((a) => a.ruleKey === rule.ruleKey) ? " - aktiv" : ""}
                      </summary>
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        <span className="font-semibold">Condition:</span> {rule.conditionExpression}
                      </p>
                      <div className="mt-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-2 text-xs text-[var(--muted)]">
                        <ReadableDataView data={rule.actionsJson} summary={t.data.viewData} />
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Section>


      <Section title={t.insights.kpiGapTable} description={t.insights.kpiGapTableDesc}>
        {kpiTable.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t.insights.runBaseline}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  {Object.keys(kpiTable[0] ?? {}).map((k) => (
                    <th key={k} className="px-3 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-200">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpiTable.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {normalizedTopGaps.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t.insights.topGaps}</p>
            <div className="mt-3 space-y-3">
              {normalizedTopGaps.slice(0, 5).map((gap) => (
                <div key={`${gap.rank}-${gap.key}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    Gap {gap.rank}: {gap.key}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{gap.description}</p>
                  {gap.blockedKpis.length > 0 && (
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold">Blockierte KPIs:</span> {gap.blockedKpis.join(", ")}
                    </p>
                  )}
                  {gap.minimalDataToFix.length > 0 && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold">Minimal zu erfassen:</span> {gap.minimalDataToFix.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title={t.insights.kpiInput} description={t.insights.kpiInputDesc} actions={
        <Link href="/data" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300">
          {t.insights.documentsData}
        </Link>
      }>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {t.insights.kpiInputHelp}
        </p>
      </Section>
    </div>
  );
}

