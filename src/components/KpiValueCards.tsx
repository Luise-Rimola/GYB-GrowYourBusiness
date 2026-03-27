"use client";

import Link from "next/link";
import { Badge } from "@/components/Badge";
import { ReadableDataView } from "@/components/ReadableDataView";
import type { Locale } from "@/lib/i18n";
import { getKpiLibraryDisplay } from "@/lib/kpiLibraryLocale";

type KpiValue = {
  id: string;
  kpiKey: string;
  value: number;
  confidence: number;
  periodEnd: Date | null;
  createdAt?: Date;
  sourceRefJson: object;
};

type LibKpi = {
  kpiKey: string;
  nameSimple: string;
  nameAdvanced: string;
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

type KpiValueCardsProps = {
  kpiValues: KpiValue[];
  library: LibKpi[];
  kpiEstimates?: KpiEstimate[];
  locale: Locale;
  t: {
    viewDetails: string;
    formula: string;
    sourceTrace: string;
    confidenceLabel: string;
    manualLabel: string;
    estimateLabel: string;
    viewHistory?: string;
  };
};

/** Group by kpiKey, take latest per KPI (by periodEnd or createdAt) */
function groupByKpiKey(kpiValues: KpiValue[]): Map<string, KpiValue> {
  const map = new Map<string, KpiValue>();
  for (const kv of kpiValues) {
    const kvDate = kv.periodEnd ?? kv.createdAt;
    const existing = map.get(kv.kpiKey);
    const existingDate = existing ? (existing.periodEnd ?? existing.createdAt) : null;
    if (!existing || (kvDate && (!existingDate || new Date(kvDate) >= new Date(existingDate)))) {
      map.set(kv.kpiKey, kv);
    }
  }
  return map;
}

export function KpiValueCards({ kpiValues, library, kpiEstimates = [], locale, t }: KpiValueCardsProps) {
  if (kpiValues.length === 0) return null;

  const latestByKey = groupByKpiKey(kpiValues);
  const historyCountByKey = new Map<string, number>();
  for (const kv of kpiValues) {
    historyCountByKey.set(kv.kpiKey, (historyCountByKey.get(kv.kpiKey) ?? 0) + 1);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from(latestByKey.entries()).map(([kpiKey, kv]) => {
        const libKpi = library.find((k) => k.kpiKey === kv.kpiKey);
        const title =
          libKpi != null
            ? getKpiLibraryDisplay(kv.kpiKey, locale, {
                kpiKey: libKpi.kpiKey,
                nameSimple: libKpi.nameSimple,
                nameAdvanced: libKpi.nameAdvanced,
                definition: libKpi.definition,
              }).title
            : kv.kpiKey;
        const sourceRef = kv.sourceRefJson as { type?: string } | null;
        const isManual = sourceRef?.type === "manual_input";
        const estimate = kpiEstimates.find((e) => e.kpi_key === kv.kpiKey);
        const historyCount = historyCountByKey.get(kpiKey) ?? 1;
        return (
          <Link
            key={kv.id}
            href={`/insights/kpi/${encodeURIComponent(kpiKey)}`}
            className="block rounded-2xl border border-zinc-200 p-4 transition hover:border-teal-300 hover:shadow-md dark:border-zinc-800 dark:hover:border-teal-700"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </p>
              <Badge
                label={isManual ? t.manualLabel : `${Math.round(kv.confidence * 100)}% ${t.confidenceLabel}`}
                tone={isManual ? "success" : kv.confidence >= 0.7 ? "success" : kv.confidence >= 0.4 ? "warning" : "danger"}
              />
            </div>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {kv.value} {kv.periodEnd ? `(${new Date(kv.periodEnd).toLocaleDateString()})` : ""}
            </p>
            {historyCount > 1 && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t.viewHistory ?? "Verlauf"} ({historyCount} Werte) →
              </p>
            )}
            {estimate != null && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t.estimateLabel}:{" "}
                {(estimate.value_month_1 != null && estimate.value_month_12 != null)
                  ? `${estimate.value_month_1} → ${estimate.value_month_12} ${estimate.unit ?? ""}`.trim()
                  : `${estimate.value ?? estimate.value_month_1 ?? "—"} ${estimate.unit ?? ""}`.trim()}
              </p>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {t.viewDetails}
              </summary>
              <div className="mt-2 space-y-2 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
                {libKpi && (
                  <p><span className="font-semibold">{t.formula}</span> {libKpi.formulaText}</p>
                )}
                <p><span className="font-semibold">{t.sourceTrace}</span></p>
                <ReadableDataView data={kv.sourceRefJson} collapsible={false} />
              </div>
            </details>
          </Link>
        );
      })}
    </div>
  );
}
