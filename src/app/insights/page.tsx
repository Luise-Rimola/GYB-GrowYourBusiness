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

export default async function InsightsPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const [kpiValues, kpiSet, library, kpiEstimationArtifact, latestKpiSetStep, strategyIndicators, latestIndicatorValues] = await Promise.all([
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
  const insightLocale = locale === "en" ? "en" : "de";

  return (
    <div className="space-y-8">
      <Section title={t.insights.integratedTitle} description={t.insights.integratedDesc}>
        <IntegratedInsightAnalysis
          locale={insightLocale}
          labels={{
            button: t.insights.integratedButton,
            loading: t.insights.integratedLoading,
          }}
        />
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
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">3) KPIs mit KI-berechnetem Wert</h3>
              {estimatedLibrary.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Noch keine KI-Berechnungen vorhanden.</p>
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

          </div>
        )}
      </Section>

      <Section title={t.insights.kpiTree}>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <ReadableDataView data={kpiTree} summary={t.data.viewData} />
        </div>
      </Section>
    </div>
  );
}

