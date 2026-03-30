"use client";

import Link from "next/link";
import { Badge } from "@/components/Badge";
import { KpiInfoButton } from "@/components/KpiInfoButton";
import type { Locale } from "@/lib/i18n";
import { getKpiLibraryDisplay } from "@/lib/kpiLibraryLocale";

type KpiValue = {
  kpiKey: string;
  value: string;
  periodEnd: Date | null;
};

type LibKpi = {
  id: string;
  kpiKey: string;
  nameSimple: string;
  nameAdvanced: string;
  domain: string;
  definition: string;
  formulaText: string;
};

type KpiEstimate = {
  kpi_key: string;
  value?: number | string;
  value_month_1?: number | string;
  value_month_12?: number | string;
  unit?: string;
  confidence?: number;
};

type KpiLibraryCardsProps = {
  library: LibKpi[];
  kpiValues: KpiValue[];
  kpiEstimates?: KpiEstimate[];
  showEstimatesSection?: boolean;
  locale: Locale;
  t: {
    infoDescription: string;
    infoCalculationMethod: string;
    infoStandsFor: string;
    estimateLabel?: string;
    estimatesSubheading?: string;
  };
};

function matchEstimate(kpiKey: string, estimates: KpiEstimate[]): KpiEstimate | undefined {
  const keyNorm = kpiKey.toLowerCase().replace(/-/g, "_");
  return estimates.find((e) => e.kpi_key.toLowerCase().replace(/-/g, "_") === keyNorm)
    ?? estimates.find((e) => e.kpi_key.toLowerCase().includes(keyNorm) || keyNorm.includes(e.kpi_key.toLowerCase()));
}

function KpiCard({
  kpi,
  displayValue,
  isEstimated,
  t,
  locale,
}: {
  kpi: LibKpi;
  displayValue: string;
  isEstimated: boolean;
  t: KpiLibraryCardsProps["t"];
  locale: Locale;
}) {
  const display = getKpiLibraryDisplay(kpi.kpiKey, locale, {
    kpiKey: kpi.kpiKey,
    nameSimple: kpi.nameSimple,
    nameAdvanced: kpi.nameAdvanced,
    definition: kpi.definition,
  });
  const cardShell = `grid min-h-[72px] grid-cols-[minmax(0,1fr)_7.5rem_9rem] items-stretch rounded-none border transition hover:border-teal-300 hover:shadow-md sm:grid-cols-[minmax(0,1fr)_8.5rem_10rem] dark:hover:border-teal-700 ${
    isEstimated
      ? "border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/60"
      : "border-zinc-200 dark:border-zinc-800"
  }`;
  return (
    <div className={cardShell}>
      <Link
        href={`/insights/kpi/${encodeURIComponent(kpi.kpiKey)}`}
        className="flex min-w-0 items-center px-3 py-3"
      >
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${isEstimated ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-50"}`}
          >
            {display.title}
          </p>
          <p className={`text-xs ${isEstimated ? "text-zinc-500 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"}`}>
            {kpi.kpiKey}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-center border-l border-zinc-200/80 px-2 py-3 text-center dark:border-zinc-700/80">
        <span
          className={`text-sm font-medium ${isEstimated ? "text-zinc-600 dark:text-zinc-400" : displayValue === "—" ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-200"}`}
        >
          {displayValue}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 border-l border-zinc-200/80 px-3 py-3 dark:border-zinc-700/80">
        <KpiInfoButton
          aria-label={`${display.title}: ${t.infoDescription} & ${t.infoCalculationMethod}`}
          meaning={kpi.nameSimple !== kpi.nameAdvanced ? `${kpi.nameSimple} = ${kpi.nameAdvanced}` : undefined}
          meaningLabel={t.infoStandsFor}
          description={display.definition}
          formula={kpi.formulaText}
          descriptionLabel={t.infoDescription}
          formulaLabel={t.infoCalculationMethod}
        />
        <div className="flex w-[92px] justify-center">
          <Badge label={kpi.domain} />
        </div>
      </div>
    </div>
  );
}

function formatEstimateDisplay(estimate: KpiEstimate): string {
  const v1 = estimate.value_month_1 ?? estimate.value;
  const v12 = estimate.value_month_12 ?? estimate.value;
  const u = estimate.unit ?? "";
  if (v1 != null && v12 != null && v1 !== v12) {
    return `${v1} ${u}`.trim() + " → " + `${v12} ${u}`.trim();
  }
  return `${v1 ?? "—"} ${u}`.trim();
}

export function KpiLibraryCards({ library, kpiValues, kpiEstimates = [], showEstimatesSection = true, locale, t }: KpiLibraryCardsProps) {
  const valueByKey = Object.fromEntries(
    kpiValues
      .filter((v, i, arr) => arr.findIndex((x) => x.kpiKey === v.kpiKey) === i)
      .map((v) => [v.kpiKey, v])
  );

  const withValues = library.filter((kpi) => valueByKey[kpi.kpiKey]);
  const withEstimatesOnly = library.filter(
    (kpi) => !valueByKey[kpi.kpiKey] && matchEstimate(kpi.kpiKey, kpiEstimates)
  );
  const withNeither = library.filter(
    (kpi) => !valueByKey[kpi.kpiKey] && !matchEstimate(kpi.kpiKey, kpiEstimates)
  );

  if (!showEstimatesSection) {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        {library.map((kpi) => {
          const kv = valueByKey[kpi.kpiKey];
          const displayValue = kv ? `${kv.value}` : "—";
          return (
            <KpiCard
              key={kpi.id}
              kpi={kpi}
              displayValue={displayValue}
              isEstimated={false}
              t={t}
              locale={locale}
            />
          );
        })}
      </div>
    );
  }

  const subheading = t.estimatesSubheading ?? "Schätzungen aus Analysen";

  return (
    <div className="space-y-6">
      <div className="grid gap-2 md:grid-cols-2">
        {withValues.map((kpi) => {
          const kv = valueByKey[kpi.kpiKey];
          const displayValue = `${kv!.value}`;
          return <KpiCard key={kpi.id} kpi={kpi} displayValue={displayValue} isEstimated={false} t={t} locale={locale} />;
        })}
        {withNeither.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} displayValue="—" isEstimated={false} t={t} locale={locale} />
        ))}
      </div>

      {withEstimatesOnly.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{subheading}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {withEstimatesOnly.map((kpi) => {
              const estimate = matchEstimate(kpi.kpiKey, kpiEstimates)!;
              const displayValue = formatEstimateDisplay(estimate);
              return (
                <KpiCard key={kpi.id} kpi={kpi} displayValue={displayValue} isEstimated t={t} locale={locale} />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
