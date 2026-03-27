import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TriggerSource = "kpi_update" | "indicator_update";

type ActiveRuleAlert = {
  ruleKey: string;
  conditionExpression: string;
  message: string | null;
  triggerSource: string | null;
  updatedAt: string;
};

let ensured = false;

async function ensureIndicatorRuleAlertTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "IndicatorRuleAlert" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "ruleKey" TEXT NOT NULL,
      "conditionExpression" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
      "lastTriggeredAt" TIMESTAMP,
      "lastClearedAt" TIMESTAMP,
      "triggerSource" TEXT,
      "message" TEXT,
      "actionsJson" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("companyId", "ruleKey")
    )
  `);
  ensured = true;
}

function normalizeBooleanExpr(expr: string) {
  return expr
    .replace(/\bAND\b/gi, "&&")
    .replace(/\bOR\b/gi, "||")
    .trim();
}

function extractIdentifiers(expr: string): string[] {
  const tokens = expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const keywords = new Set(["AND", "OR", "and", "or", "true", "false"]);
  return [...new Set(tokens.filter((t) => !keywords.has(t)))];
}

function evaluateCondition(expr: string, values: Record<string, number>): boolean {
  const normalized = normalizeBooleanExpr(expr);
  const identifiers = extractIdentifiers(normalized);
  // If expression references unknown variables, we do not fire it.
  if (identifiers.some((id) => !(id in values))) return false;
  const safeExpr = identifiers.reduce(
    (acc, id) => acc.replace(new RegExp(`\\b${id}\\b`, "g"), `values["${id}"]`),
    normalized
  );
  try {
    const fn = new Function("values", `return Boolean(${safeExpr});`) as (v: Record<string, number>) => boolean;
    return fn(values);
  } catch {
    return false;
  }
}

async function loadLatestKpiValues(companyId: string): Promise<Record<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ kpiKey: string; value: number }>>(
    Prisma.sql`
      SELECT v."kpiKey" AS "kpiKey", v."value" AS "value"
      FROM "KpiValue" v
      INNER JOIN (
        SELECT "kpiKey", MAX("createdAt") AS "maxCreatedAt"
        FROM "KpiValue"
        WHERE "companyId" = ${companyId}
        GROUP BY "kpiKey"
      ) latest
      ON latest."kpiKey" = v."kpiKey"
      AND v."createdAt" = latest."maxCreatedAt"
      WHERE v."companyId" = ${companyId}
    `
  );
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.kpiKey] = row.value;
    return acc;
  }, {});
}

async function loadLatestIndicatorValues(companyId: string): Promise<Record<string, number>> {
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

function pickRuleReason(actionsJson: unknown): string | null {
  if (!Array.isArray(actionsJson)) return null;
  for (const action of actionsJson) {
    if (action && typeof action === "object") {
      const reason = (action as Record<string, unknown>).reason;
      if (typeof reason === "string" && reason.trim()) return reason.trim();
    }
  }
  return null;
}

export async function evaluateCompanyIndicatorRules(companyId: string, triggerSource: TriggerSource) {
  await ensureIndicatorRuleAlertTable();
  const [rules, kpiValues, indicatorValues] = await Promise.all([
    prisma.indicatorMappingRule.findMany(),
    loadLatestKpiValues(companyId),
    loadLatestIndicatorValues(companyId),
  ]);
  const values: Record<string, number> = { ...kpiValues, ...indicatorValues };

  for (const rule of rules) {
    const isActive = evaluateCondition(rule.conditionExpression, values);
    const message = pickRuleReason(rule.actionsJson);
    await prisma.$executeRaw(
      Prisma.sql`
      INSERT INTO "IndicatorRuleAlert"
        ("id", "companyId", "ruleKey", "conditionExpression", "isActive", "lastTriggeredAt", "lastClearedAt", "triggerSource", "message", "actionsJson", "createdAt", "updatedAt")
      VALUES
        (
          ${`ira_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`},
          ${companyId},
          ${rule.ruleKey},
          ${rule.conditionExpression},
          ${isActive},
          ${isActive ? Prisma.sql`CURRENT_TIMESTAMP` : Prisma.sql`NULL`},
          ${!isActive ? Prisma.sql`CURRENT_TIMESTAMP` : Prisma.sql`NULL`},
          ${triggerSource},
          ${message},
          ${JSON.stringify(rule.actionsJson ?? [])},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      ON CONFLICT("companyId", "ruleKey") DO UPDATE SET
        "conditionExpression" = EXCLUDED."conditionExpression",
        "isActive" = EXCLUDED."isActive",
        "lastTriggeredAt" = CASE WHEN EXCLUDED."isActive" THEN CURRENT_TIMESTAMP ELSE "IndicatorRuleAlert"."lastTriggeredAt" END,
        "lastClearedAt" = CASE WHEN NOT EXCLUDED."isActive" THEN CURRENT_TIMESTAMP ELSE "IndicatorRuleAlert"."lastClearedAt" END,
        "triggerSource" = EXCLUDED."triggerSource",
        "message" = EXCLUDED."message",
        "actionsJson" = EXCLUDED."actionsJson",
        "updatedAt" = CURRENT_TIMESTAMP
      `
    );
  }
}

export async function getActiveIndicatorRuleAlerts(companyId: string): Promise<ActiveRuleAlert[]> {
  await ensureIndicatorRuleAlertTable();
  return prisma.$queryRaw<ActiveRuleAlert[]>(
    Prisma.sql`
      SELECT "ruleKey" AS "ruleKey", "conditionExpression" AS "conditionExpression", "message" AS "message", "triggerSource" AS "triggerSource", "updatedAt" AS "updatedAt"
      FROM "IndicatorRuleAlert"
      WHERE "companyId" = ${companyId} AND "isActive" = TRUE
      ORDER BY "updatedAt" DESC
    `
  );
}

