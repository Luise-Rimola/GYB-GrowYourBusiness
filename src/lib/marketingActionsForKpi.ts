import { prisma } from "@/lib/prisma";
import type { MarketingAction } from "@prisma/client";

/** Normalize KPI keys for comparison (cac, CAC, north-star → north_star). */
export function normalizeKpiKey(s: string): string {
  return s.trim().toLowerCase().replace(/-/g, "_");
}

type SourceRef = {
  relatedKpiKeys?: string[];
  batchId?: string;
  sourceId?: string;
  type?: string;
};

/**
 * Maßnahmen, die zu diesem KPI gehören:
 * - explizit in `relatedKpiKeys` gespeichert, oder
 * - derselbe Text-Batch (`batchId`) wie ein KPI-Wert dieses Keys, oder
 * - dieselbe Dokument-Quelle (`sourceId`) wie ein KPI-Wert dieses Keys.
 */
export async function getMarketingActionsForKpi(
  companyId: string,
  kpiKey: string
): Promise<MarketingAction[]> {
  const norm = normalizeKpiKey(kpiKey);

  const [kpiValuesForKey, allActions] = await Promise.all([
    prisma.kpiValue.findMany({
      where: { companyId, kpiKey },
      select: { sourceRefJson: true },
    }),
    prisma.marketingAction.findMany({
      where: { companyId },
      orderBy: { actionDate: "desc" },
      take: 250,
    }),
  ]);

  const batchIds = new Set<string>();
  const sourceIds = new Set<string>();
  for (const v of kpiValuesForKey) {
    const ref = v.sourceRefJson as SourceRef | null;
    if (ref?.batchId) batchIds.add(ref.batchId);
    if (ref?.type === "document_extraction" && ref.sourceId) sourceIds.add(ref.sourceId);
  }

  const related = allActions.filter((a) => {
    const ref = (a.sourceRefJson ?? {}) as SourceRef;
    if (Array.isArray(ref.relatedKpiKeys) && ref.relatedKpiKeys.some((k) => normalizeKpiKey(k) === norm)) {
      return true;
    }
    if (ref.batchId && batchIds.has(ref.batchId)) return true;
    if (ref.sourceId && sourceIds.has(ref.sourceId)) return true;
    return false;
  });

  return related.sort((x, y) => y.actionDate.getTime() - x.actionDate.getTime());
}
