import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateCompanyIndicatorRules } from "@/lib/indicatorMappingRulesEngine";

type IndicatorPayload = {
  value: number;
  confidence?: number;
  rationale?: string;
  evidence_grade?: string;
};

let ensured = false;

export async function ensureStrategyIndicatorValueTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StrategyIndicatorValue" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "runId" TEXT NOT NULL,
      "runStepId" TEXT NOT NULL,
      "workflowKey" TEXT NOT NULL,
      "stepKey" TEXT NOT NULL,
      "indicatorKey" TEXT NOT NULL,
      "value" DOUBLE PRECISION NOT NULL,
      "confidence" DOUBLE PRECISION,
      "rationale" TEXT,
      "evidenceGrade" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_StrategyIndicatorValue_runStep_indicator
    ON "StrategyIndicatorValue" ("runStepId", "indicatorKey")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_StrategyIndicatorValue_company_indicator_created
    ON "StrategyIndicatorValue" ("companyId", "indicatorKey", "createdAt" DESC)
  `);
  ensured = true;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function normalizeStrategyIndicatorMap(input: unknown): Record<string, IndicatorPayload> {
  if (!input || typeof input !== "object") return {};
  if (Array.isArray(input)) return {};
  const out: Record<string, IndicatorPayload> = {};
  for (const [indicatorKey, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    const value = toNumber(item.value);
    if (value == null) continue;
    const confidence = toNumber(item.confidence) ?? undefined;
    out[indicatorKey] = {
      value,
      confidence: confidence != null ? Math.max(0, Math.min(1, confidence)) : undefined,
      rationale: typeof item.rationale === "string" ? item.rationale : undefined,
      evidence_grade: typeof item.evidence_grade === "string" ? item.evidence_grade : undefined,
    };
  }
  return out;
}

export async function saveStrategyIndicatorValues(params: {
  companyId: string;
  runId: string;
  runStepId: string;
  workflowKey: string;
  stepKey: string;
  indicators: Record<string, IndicatorPayload>;
}) {
  const entries = Object.entries(params.indicators);
  if (entries.length === 0) return;
  await ensureStrategyIndicatorValueTable();
  for (const [indicatorKey, item] of entries) {
    const id = `siv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "StrategyIndicatorValue" (
          "id", "companyId", "runId", "runStepId", "workflowKey", "stepKey", "indicatorKey", "value", "confidence", "rationale", "evidenceGrade"
        ) VALUES (
          ${id}, ${params.companyId}, ${params.runId}, ${params.runStepId}, ${params.workflowKey}, ${params.stepKey}, ${indicatorKey}, ${item.value}, ${item.confidence ?? null}, ${item.rationale ?? null}, ${item.evidence_grade ?? null}
        )
        ON CONFLICT ("runStepId", "indicatorKey") DO UPDATE SET
          "companyId" = EXCLUDED."companyId",
          "runId" = EXCLUDED."runId",
          "workflowKey" = EXCLUDED."workflowKey",
          "stepKey" = EXCLUDED."stepKey",
          "value" = EXCLUDED."value",
          "confidence" = EXCLUDED."confidence",
          "rationale" = EXCLUDED."rationale",
          "evidenceGrade" = EXCLUDED."evidenceGrade",
          "createdAt" = CURRENT_TIMESTAMP
      `
    );
  }
  await evaluateCompanyIndicatorRules(params.companyId, "indicator_update");
}

export async function getLatestStrategyIndicatorValues(companyId: string): Promise<Record<string, number>> {
  await ensureStrategyIndicatorValueTable();
  const rows = await prisma.$queryRaw<Array<{ indicatorKey: string; value: number }>>(
    Prisma.sql`
      SELECT v."indicatorKey" AS "indicatorKey", v."value" AS "value"
      FROM "StrategyIndicatorValue" v
      INNER JOIN (
        SELECT "indicatorKey", MAX("createdAt") AS "maxCreatedAt"
        FROM "StrategyIndicatorValue"
        WHERE "companyId" = ${companyId}
        GROUP BY "indicatorKey"
      ) latest
      ON latest."indicatorKey" = v."indicatorKey"
      AND v."createdAt" = latest."maxCreatedAt"
      WHERE v."companyId" = ${companyId}
    `
  );
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.indicatorKey] = row.value;
    return acc;
  }, {});
}

