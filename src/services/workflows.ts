import { $Enums, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { validateStrictJson } from "@/lib/validators";
import { normalizeStrategyIndicatorMap, saveStrategyIndicatorValues } from "@/lib/strategyIndicatorValues";

/** Ensure data is JSON-serializable for Prisma Json fields (strips undefined, etc.) */
function toPrismaJson(obj: unknown): object {
  return JSON.parse(JSON.stringify(obj ?? {}));
}

/** Create artifact – fallback to raw SQL if Prisma client enum is outdated (e.g. after schema change without regenerate) */
async function createArtifactWithEnumFallback(params: {
  companyId: string;
  runId: string;
  type: string;
  title: string;
  contentJson: object;
  exportHtml: string | null;
}) {
  try {
    await prisma.artifact.create({
      data: {
        companyId: params.companyId,
        runId: params.runId,
        type: params.type as "work_processes" | "marketing_strategy",
        title: params.title,
        version: 1,
        contentJson: params.contentJson,
        exportHtml: params.exportHtml,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Invalid value") || msg.includes("Expected ArtifactType") || msg.includes("PrismaClientValidationError")) {
      const id = "c" + randomUUID().replace(/-/g, "").slice(0, 24);
      const contentStr = JSON.stringify(params.contentJson);
      const exportVal = params.exportHtml ?? "";
      await prisma.$executeRaw(
        Prisma.sql`INSERT INTO "Artifact" ("id", "companyId", "runId", "type", "title", "version", "contentJson", "exportHtml", "approved", "reviewStatus", "createdAt") VALUES (${id}, ${params.companyId}, ${params.runId}, ${params.type}, ${params.title}, 1, ${contentStr}, ${exportVal}, 0, ${"open"}, CURRENT_TIMESTAMP)`
      );
    } else {
      throw err;
    }
  }
}

/** Create work_processes artifact – fallback to raw SQL if Prisma client enum is outdated */
async function createWorkProcessesArtifact(params: {
  companyId: string;
  runId: string;
  title: string;
  contentJson: object;
  exportHtml: string;
}) {
  await createArtifactWithEnumFallback({
    ...params,
    type: "work_processes",
    exportHtml: params.exportHtml,
  });
}

/** Parse Miete (rent) in EUR from real_estate: best_option price_range or average of options or average_market_prices */
function parseMieteFromRealEstate(realEstate: Record<string, unknown> | null): number | null {
  if (!realEstate || typeof realEstate !== "object") return null;
  const opts = realEstate.options as Array<{ price_range?: string }> | undefined;
  const bestIdx = realEstate.best_option_index as number | undefined;
  const avgPrices = realEstate.average_market_prices as Array<{ avg_price?: string }> | undefined;

  function parsePrice(s: string | undefined): number | null {
    if (!s || typeof s !== "string") return null;
    const nums = s.replace(/[^\d.,]/g, " ").split(/\s+/).map((n) => parseFloat(n.replace(",", "."))).filter((n) => !isNaN(n) && n > 0);
    if (nums.length === 0) return null;
    if (nums.length === 1) return nums[0];
    return (nums[0] + nums[nums.length - 1]) / 2;
  }

  if (opts?.length && bestIdx != null && bestIdx >= 0 && bestIdx < opts.length) {
    const v = parsePrice(opts[bestIdx]?.price_range);
    if (v != null) return Math.round(v);
  }
  if (opts?.length) {
    const values = opts.map((o) => parsePrice(o?.price_range)).filter((v): v is number => v != null);
    if (values.length > 0) return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }
  if (avgPrices?.length) {
    const v = parsePrice(avgPrices[0]?.avg_price);
    if (v != null) return Math.round(v);
  }
  return null;
}

/** Normalize month string to YYYY-MM for reliable lookup (handles "2025-1", "01.2025", etc.) */
function normalizeMonth(month: string): string {
  const s = String(month || "").trim();
  const m = s.match(/20\d{2}[-.]?(\d{1,2})/);
  if (m) return `${m[0].slice(0, 4)}-${m[1].padStart(2, "0")}`;
  const m2 = s.match(/(\d{1,2})[-.]20\d{2}/);
  if (m2) return `${m2[0].slice(-4)}-${m2[1].padStart(2, "0")}`;
  return s;
}

const PERSONNEL_CATEGORIES = ["Personal", "Personalkosten", "Personnel"];

/** Override Personal in monthly_projection cost_items with values from personnel_plan.monthly_personnel_costs; recalc total_costs and net */
function applyPersonnelFromPersonnelPlan<T extends Record<string, unknown>>(
  data: T,
  monthlyPersonnel: Array<{ month: string; total_personnel_eur: number }>
): T {
  const proj = data.monthly_projection as Array<{ month?: string; revenue: number; cost_items?: Array<{ category: string; amount: number }>; total_costs: number; net: number }> | undefined;
  if (!proj?.length || !monthlyPersonnel.length) return data;
  const byMonth = Object.fromEntries(
    monthlyPersonnel.map((m) => [normalizeMonth(m.month), m.total_personnel_eur])
  );
  const out = { ...data, monthly_projection: proj.map((m) => {
    const key = normalizeMonth((m as { month?: string }).month ?? "");
    const personnel = byMonth[key];
    if (personnel == null) return m;
    const items = m.cost_items ?? [];
    const hasPersonnel = items.some((c) => PERSONNEL_CATEGORIES.includes(c.category));
    let newItems: Array<{ category: string; amount: number; cost_type?: string; note?: string }>;
    if (hasPersonnel) {
      let replaced = false;
      newItems = items.map((c) => {
        if (!PERSONNEL_CATEGORIES.includes(c.category)) return c;
        if (!replaced) {
          replaced = true;
          return { ...c, amount: personnel };
        }
        return { ...c, amount: 0 };
      });
    } else {
      newItems = [...items, { category: "Personal", amount: personnel, cost_type: "fixed" as const }];
    }
    const total_costs = newItems.reduce((s, c) => s + c.amount, 0);
    const net = m.revenue - total_costs;
    return { ...m, cost_items: newItems, total_costs, net };
  }) };
  return out as T;
}

/** Override Miete in monthly_projection cost_items with parsed value from real_estate; recalc total_costs and net */
function applyMieteFromRealEstate<T extends Record<string, unknown>>(
  data: T,
  miete: number
): T {
  const proj = data.monthly_projection as Array<{ revenue: number; cost_items?: Array<{ category: string; amount: number }>; total_costs: number; net: number }> | undefined;
  if (!proj?.length) return data;
  const out = { ...data, monthly_projection: proj.map((m) => {
    const items = m.cost_items ?? [];
    const hasMiete = items.some((c) => c.category === "Miete");
    if (!hasMiete) return m;
    const newItems = items.map((c) => (c.category === "Miete" ? { ...c, amount: miete } : c));
    const total_costs = newItems.reduce((s, c) => s + c.amount, 0);
    const net = m.revenue - total_costs;
    return { ...m, cost_items: newItems, total_costs, net };
  }) };
  return out as T;
}

/** Extract clean absolute URL from LLM output (markdown, brackets, etc.) for real estate links */
function extractRealEstateUrl(raw: string): string | null {
  const s = String(raw).trim();
  if (!s) return null;
  const mdMatch = s.match(/\]\s*\(\s*(https?:\/\/[^\s)]+)\s*\)/);
  if (mdMatch) return mdMatch[1];
  const angleMatch = s.match(/<([^>]+)>/);
  if (angleMatch) {
    const u = angleMatch[1].trim();
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    return `https://${u}`;
  }
  const parenMatch = s.match(/\(\s*(https?:\/\/[^\s)]+)\s*\)\s*$/);
  if (parenMatch) return parenMatch[1];
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.includes(".") && !s.includes(" ")) return `https://${s}`;
  return null;
}
import { SchemaKey } from "@/types/schemas";
import {
  decisionPackSchema,
  businessModelInferenceSchema,
  kpiSetSelectionSchema,
  kpiGapReportSchema,
  industryResearchSchema,
  kpiAnswersSchema,
  marketSnapshotSchema,
  marketResearchSchema,
  businessPlanSchema,
  businessPlanSectionSchema,
  rootCauseTreesSchema,
  kpiQuestionsSchema,
  bestPracticesSchema,
  failureReasonsSchema,
  supplierListSchema,
  menuCardSchema,
  menuCostSchema,
  menuPreiskalkulationSchema,
  realEstateSchema,
  startupConsultingSchema,
  customerValidationSchema,
  processOptimizationSchema,
  strategicOptionsSchema,
  hrPlanningSchema,
  valuePropositionSchema,
  goToMarketSchema,
  scalingStrategySchema,
  marketingStrategySchema,
  portfolioManagementSchema,
  scenarioAnalysisSchema,
  operativePlanSchema,
  swotAnalysisSchema,
  financialPlanningSchema,
  personnelPlanSchema,
  workProcessesSchema,
  strategicPlanningSchema,
  trendAnalysisSchema,
  competitorAnalysisSchema,
  kpiEstimationSchema,
} from "@/types/schemas";

const FINANCIAL_SUB_STEPS = ["financial_liquidity", "financial_profitability", "financial_capital", "financial_break_even", "financial_monthly_h1", "financial_monthly_h2"] as const;

export const WorkflowService = {
  async createRun(companyId: string, workflowKey: string, inputSnapshot: unknown) {
    return prisma.run.create({
      data: {
        companyId,
        workflowKey,
        status: "draft",
        inputSnapshotJson: inputSnapshot as object,
      },
    });
  },

  async saveStep(params: {
    runId: string;
    stepKey: string;
    schemaKey: SchemaKey;
    promptRendered: string;
    userResponse: string;
    promptTemplateVersion?: number;
  }) {
    const validation = validateStrictJson(params.userResponse, params.schemaKey);

    const existing = await prisma.runStep.findFirst({
      where: { runId: params.runId, stepKey: params.stepKey },
    });

    const stepData = {
      promptRendered: params.promptRendered,
      promptTemplateVersion: params.promptTemplateVersion,
      userPastedResponse: validation.ok
        ? JSON.stringify(validation.data, null, 2)
        : params.userResponse,
      parsedOutputJson: validation.ok ? (validation.data as object) : undefined,
      schemaValidationPassed: validation.ok,
      validationErrorsJson: validation.ok ? undefined : (validation.errors as object),
      ...(existing && { verifiedByUser: false }),
    };

    const step = existing
      ? await prisma.runStep.update({ where: { id: existing.id }, data: stepData })
      : await prisma.runStep.create({
          data: { runId: params.runId, stepKey: params.stepKey, ...stepData },
        });

    if (validation.ok) {
      const run = await prisma.run.findUnique({ where: { id: params.runId }, include: { steps: true } });
      if (run) {
        const strategyIndicatorPayload =
          validation.data && typeof validation.data === "object"
            ? (validation.data as Record<string, unknown>).strategy_indicators
            : undefined;
        const strategyIndicators = normalizeStrategyIndicatorMap(strategyIndicatorPayload);
        if (Object.keys(strategyIndicators).length > 0) {
          await saveStrategyIndicatorValues({
            companyId: run.companyId,
            runId: run.id,
            runStepId: step.id,
            workflowKey: run.workflowKey,
            stepKey: params.stepKey,
            indicators: strategyIndicators,
          });
        }
        if (params.stepKey === "business_model_inference") {
          const parsed = businessModelInferenceSchema.safeParse(validation.data);
          if (parsed.success) {
            const validTypes = ["saas", "ecom", "local", "services", "marketplace", "mixed"] as const;
            const validStages = ["pre_revenue", "early_revenue", "growth", "scaling"] as const;
            const typeNorm = String(parsed.data.business_model_type || "").toLowerCase().trim();
            const businessType = typeNorm && validTypes.includes(typeNorm as typeof validTypes[number])
              ? (typeNorm as typeof validTypes[number])
              : "mixed";
            const stageNorm = parsed.data.stage.toLowerCase().replace(/[\s-]/g, "_");
            const stage = validStages.includes(stageNorm as typeof validStages[number])
              ? (stageNorm as typeof validStages[number])
              : "early_revenue";
            await prisma.company.update({
              where: { id: run.companyId },
              data: {
                inferredBusinessModelType: businessType,
                inferredConfidence: parsed.data.confidence,
                stageGuess: stage,
                stageConfidence: parsed.data.stage_confidence,
              },
            });
          }
        } else if (params.stepKey === "kpi_set_selection") {
          const parsed = kpiSetSelectionSchema.safeParse(validation.data);
          if (parsed.success) {
            const latest = await prisma.companyKpiSet.findFirst({
              where: { companyId: run.companyId },
              orderBy: { version: "desc" },
            });
            await prisma.companyKpiSet.create({
              data: {
                companyId: run.companyId,
                version: (latest?.version ?? 0) + 1,
                selectedKpisJson: parsed.data.selected_kpis as object,
                kpiTreeJson: parsed.data.kpi_tree as object,
                rationaleJson: { rationale: parsed.data.rationale } as object,
              },
            });
          }
        } else if (params.stepKey === "kpi_gap_scan") {
          const parsed = kpiGapReportSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: $Enums.ArtifactType.baseline,
                title: "Baseline KPI Gap Report",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderBaselineHtml(parsed.data),
              },
            });
          }
        } else if (params.stepKey === "industry_research") {
          const parsed = industryResearchSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "industry_research",
                title: "Industry & Location Data",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderIndustryResearchHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "market_snapshot") {
          const parsed = marketSnapshotSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: $Enums.ArtifactType.market,
                title: "Market Snapshot",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderMarketHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "kpi_estimation") {
          const parsed = kpiEstimationSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "kpi_estimation",
                title: "KPI Estimation",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderKpiEstimationHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "decision_engine" && params.schemaKey === "decision_pack") {
          const parsed = decisionPackSchema.safeParse(validation.data);
          if (parsed.success) {
            await this.createDecisionsFromPack(run.companyId, run.id, parsed.data);
          }
        } else if (params.stepKey === "root_cause_trees") {
          const parsed = rootCauseTreesSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: $Enums.ArtifactType.diagnostic,
                title: "Root Cause Trees",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderDiagnosticHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "kpi_computation_plan" && params.schemaKey === "kpi_questions") {
          const parsed = kpiQuestionsSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "data_collection_plan",
                title: "KPI Computation Plan",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderDataCollectionPlanHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "market_research") {
          const parsed = marketResearchSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "market_research",
                title: "Market Research",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderMarketResearchHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "best_practices") {
          const parsed = bestPracticesSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "best_practices",
                title: "Best Practices",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderBestPracticesHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "failure_reasons") {
          const parsed = failureReasonsSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "failure_analysis",
                title: "Why Businesses Fail",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderFailureReasonsHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "competitor_analysis") {
          const parsed = competitorAnalysisSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "competitor_analysis",
                title: "Wettbewerbsanalyse",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderCompetitorAnalysisHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "business_plan_risk") {
          const fullRun = await prisma.run.findUnique({
            where: { id: run.id },
            include: { steps: true },
          });
          if (fullRun) {
            const execStep = fullRun.steps.find((s) => s.stepKey === "business_plan_executive");
            const marketStep = fullRun.steps.find((s) => s.stepKey === "business_plan_market");
            const marketingStep = fullRun.steps.find((s) => s.stepKey === "business_plan_marketing");
            const financialStep = fullRun.steps.find((s) => s.stepKey === "business_plan_financial");
            const riskStep = fullRun.steps.find((s) => s.stepKey === "business_plan_risk");
            const exec = execStep?.schemaValidationPassed && execStep.parsedOutputJson
              ? businessPlanSectionSchema.safeParse(execStep.parsedOutputJson)
              : { success: false as const };
            const market = marketStep?.schemaValidationPassed && marketStep.parsedOutputJson
              ? businessPlanSectionSchema.safeParse(marketStep.parsedOutputJson)
              : { success: false as const };
            const marketing = marketingStep?.schemaValidationPassed && marketingStep.parsedOutputJson
              ? businessPlanSectionSchema.safeParse(marketingStep.parsedOutputJson)
              : { success: false as const };
            const financial = financialStep?.schemaValidationPassed && financialStep.parsedOutputJson
              ? businessPlanSchema.safeParse(financialStep.parsedOutputJson)
              : { success: false as const };
            const risk = riskStep?.schemaValidationPassed && validation.data
              ? businessPlanSectionSchema.safeParse(validation.data)
              : { success: false as const };
            if (exec.success && market.success && marketing.success && financial.success && risk.success) {
              const fpArtifact = await prisma.artifact.findFirst({
                where: { companyId: run.companyId, type: "financial_planning" },
                orderBy: { createdAt: "desc" },
              });
              const fpContent = fpArtifact?.contentJson as { monthly_projection?: unknown[] } | null;
              const monthlyProj = (fpContent?.monthly_projection?.length ? fpContent.monthly_projection : financial.data.monthly_projection) ?? financial.data.monthly_projection;
              const merged = {
                executive_summary: exec.data,
                market_analysis: market.data,
                marketing_plan: marketing.data,
                financial_scenarios: financial.data,
                management_team: financial.data.management_team,
                legal_structure: financial.data.legal_structure,
                capital_requirements_summary: financial.data.capital_requirements_summary,
                monthly_projection: monthlyProj,
                risk_analysis: risk.data,
              };
              await prisma.artifact.create({
                data: {
                  companyId: run.companyId,
                  runId: run.id,
                  type: "business_plan",
                  title: "Business Plan",
                  version: 1,
                  contentJson: merged as object,
                  exportHtml: this.renderBusinessPlanMultiSectionHtml(merged as { executive_summary?: { content: string; key_points?: string[] }; market_analysis?: { content: string; key_points?: string[] }; marketing_plan?: { content: string; key_points?: string[] }; monthly_projection?: { month: string; revenue?: number; total_costs?: number; net?: number }[]; [key: string]: unknown }),
                },
              });
              await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
            }
          }
        } else if (params.stepKey === "menu_card") {
          const parsed = menuCardSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: $Enums.ArtifactType.menu_card,
                title: "Menu Card",
                version: 1,
                contentJson: toPrismaJson(parsed.data),
                exportHtml: this.renderMenuCardHtml(parsed.data),
              },
            });
            if (run.workflowKey !== "WF_MENU_PRICING") await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "supplier_list") {
          const parsed = supplierListSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "supplier_list",
                title: "Supplier List",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderSupplierListHtml(parsed.data),
              },
            });
            if (run.workflowKey !== "WF_MENU_PRICING") await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "menu_cost") {
          const parsed = menuCostSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: $Enums.ArtifactType.menu_cost,
                title: "Warenkosten",
                version: 1,
                contentJson: toPrismaJson(parsed.data),
                exportHtml: this.renderMenuCostHtml(parsed.data),
              },
            });
            if (run.workflowKey !== "WF_MENU_PRICING") await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "menu_preiskalkulation") {
          const parsed = menuPreiskalkulationSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: $Enums.ArtifactType.menu_preiskalkulation,
                title: "Preiskalkulation",
                version: 1,
                contentJson: toPrismaJson(parsed.data),
                exportHtml: this.renderMenuPreiskalkulationHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "real_estate") {
          const parsed = realEstateSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "real_estate",
                title: "Real Estate Options",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderRealEstateHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "startup_consulting") {
          const parsed = startupConsultingSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "startup_guide",
                title: "Funding",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderStartupConsultingHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "customer_validation") {
          const parsed = customerValidationSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "customer_validation",
                title: "Customer Validation",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderCustomerValidationHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "process_optimization") {
          const parsed = processOptimizationSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "process_optimization",
                title: "Process Optimization",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderProcessOptimizationHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "strategic_options") {
          const parsed = strategicOptionsSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "strategic_options",
                title: "Strategic Options",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderStrategicOptionsHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "hr_planning") {
          const parsed = hrPlanningSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "hr_planning",
                title: "HR Planning",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderHrPlanningHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "value_proposition") {
          const parsed = valuePropositionSchema.safeParse(validation.data);
          if (parsed.success) {
            const artifactData = {
              companyId: run.companyId,
              runId: run.id,
              type: $Enums.ArtifactType.value_proposition,
              title: "Value Proposition & Problem-Solution-Fit",
              version: 1,
              contentJson: toPrismaJson(parsed.data),
              exportHtml: this.renderValuePropositionHtml(parsed.data) ?? undefined,
            };
            try {
              await prisma.artifact.create({ data: artifactData });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              throw new Error(`Artifact create failed (value_proposition): ${msg}`);
            }
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "go_to_market") {
          const parsed = goToMarketSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "go_to_market",
                title: "Go-to-Market & Pricing",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderGoToMarketHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "marketing_strategy") {
          const parsed = marketingStrategySchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "marketing_strategy",
              title: "Marketing Strategie",
              contentJson: parsed.data as object,
              exportHtml: this.renderMarketingStrategyHtml(parsed.data),
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "scaling_strategy") {
          const parsed = scalingStrategySchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "scaling_strategy",
                title: "Scaling Strategy",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderScalingStrategyHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "portfolio_management") {
          const parsed = portfolioManagementSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "portfolio_management",
                title: "Portfolio & Brand Strategy",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderPortfolioManagementHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "scenario_analysis") {
          const parsed = scenarioAnalysisSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "scenario_analysis",
                title: "Scenario & Risk Analysis",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderScenarioAnalysisHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "operative_plan") {
          const parsed = operativePlanSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "operative_plan",
                title: "Operative Plan",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderOperativePlanHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "swot_analysis") {
          const parsed = swotAnalysisSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "swot_analysis",
                title: "SWOT-Analyse",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderSwotAnalysisHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "work_processes") {
          const parsed = workProcessesSchema.safeParse(validation.data);
          if (parsed.success) {
            await createWorkProcessesArtifact({
              companyId: run.companyId,
              runId: run.id,
              title: "Arbeitsprozesse (Planung → Einkauf → Endkunde)",
              contentJson: toPrismaJson(parsed.data),
              exportHtml: this.renderWorkProcessesHtml(parsed.data),
            });
          }
        } else if (params.stepKey === "personnel_plan") {
          const parsed = personnelPlanSchema.safeParse(validation.data);
          if (parsed.success) {
            const artifactData = {
              companyId: run.companyId,
              runId: run.id,
              type: "personnel_plan" as const,
              title: "Personalplan Jahr 1",
              version: 1,
              contentJson: parsed.data as object,
            };
            try {
              await prisma.artifact.create({ data: artifactData });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              throw new Error(`Artifact create failed (personnel_plan): ${msg}`);
            }
          }
        } else if (["financial_liquidity", "financial_profitability", "financial_capital", "financial_break_even", "financial_monthly_h1", "financial_monthly_h2"].includes(params.stepKey)) {
          const merged = await this.tryMergeFinancialPlanningSteps(run);
          if (merged) {
            let content = merged;
            const realEstateArtifact = await prisma.artifact.findFirst({
              where: { companyId: run.companyId, type: "real_estate" },
              orderBy: { createdAt: "desc" },
            });
            const realEstate = realEstateArtifact?.contentJson as Record<string, unknown> | null;
            const miete = parseMieteFromRealEstate(realEstate);
            if (miete != null) content = applyMieteFromRealEstate(content, miete);
            const personnelPlanArtifact = await prisma.artifact.findFirst({
              where: { companyId: run.companyId, type: "personnel_plan" },
              orderBy: { createdAt: "desc" },
            });
            const personnelPlan = personnelPlanArtifact?.contentJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null;
            const personnelStep = (run as { steps?: Array<{ stepKey: string; parsedOutputJson: unknown }> }).steps?.find((s: { stepKey: string }) => s.stepKey === "personnel_plan");
            const personnelData = (personnelStep?.parsedOutputJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null) ?? personnelPlan;
            if (personnelData?.monthly_personnel_costs?.length) {
              content = applyPersonnelFromPersonnelPlan(content, personnelData.monthly_personnel_costs);
            }
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "financial_planning",
                title: "Finanzplanung",
                version: 1,
                contentJson: content as object,
                exportHtml: this.renderFinancialPlanningHtml(content),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "strategic_planning") {
          const parsed = strategicPlanningSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "strategic_planning",
                title: "Strategische Planung",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderStrategicPlanningHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "trend_analysis") {
          const parsed = trendAnalysisSchema.safeParse(validation.data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "trend_analysis",
                title: "Trendanalyse",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderTrendAnalysisHtml(parsed.data),
              },
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        } else if (params.stepKey === "tech_digitalization") {
          const { techDigitalizationSchema } = await import("@/types/schemas");
          const parsed = techDigitalizationSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "tech_digitalization",
              title: "Technologie & Digitalisierung",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "automation_roi") {
          const { automationRoiSchema } = await import("@/types/schemas");
          const parsed = automationRoiSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "automation_roi",
              title: "Computer-Automatisierung & ROI",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "physical_automation") {
          const { physicalAutomationSchema } = await import("@/types/schemas");
          const parsed = physicalAutomationSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "physical_automation",
              title: "Physische Prozess-Automatisierung",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "app_ideas") {
          const { appProjectPlanSchema } = await import("@/types/schemas");
          const parsed = appProjectPlanSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "app_project_plan",
              title: "App-Projektplan",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "app_requirements") {
          const { appRequirementsSchema } = await import("@/types/schemas");
          const parsed = appRequirementsSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "app_requirements",
              title: "App-Requirements",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "app_tech_spec") {
          const { appTechSpecSchema } = await import("@/types/schemas");
          const parsed = appTechSpecSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "app_tech_spec",
              title: "App-Technische Spezifikation",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "app_mvp_guide") {
          const { appMvpGuideSchema } = await import("@/types/schemas");
          const parsed = appMvpGuideSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "app_mvp_guide",
              title: "App-MVP-Anleitung",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "app_page_specs") {
          const { appPageSpecsSchema } = await import("@/types/schemas");
          const parsed = appPageSpecsSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "app_page_specs",
              title: "App-Seiten-Spezifikation",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
          }
        } else if (params.stepKey === "app_db_schema") {
          const { appDbSchemaSchema } = await import("@/types/schemas");
          const parsed = appDbSchemaSchema.safeParse(validation.data);
          if (parsed.success) {
            await createArtifactWithEnumFallback({
              companyId: run.companyId,
              runId: run.id,
              type: "app_db_schema",
              title: "App-Datenbank-Schema",
              contentJson: parsed.data as object,
              exportHtml: null,
            });
            await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
          }
        }
      }
    }

    return step;
  },

  /** Merge financial sub-steps into full financial_planning. Returns merged content if all 6 steps are valid, else null. */
  async tryMergeFinancialPlanningSteps(run: { id: string; companyId: string; workflowKey: string; steps: { stepKey: string; parsedOutputJson: unknown; schemaValidationPassed: boolean }[] }): Promise<Record<string, unknown> | null> {
    if (run.workflowKey !== "WF_FINANCIAL_PLANNING") return null;
    const stepsByKey = Object.fromEntries(run.steps.filter((s) => FINANCIAL_SUB_STEPS.includes(s.stepKey as typeof FINANCIAL_SUB_STEPS[number])).map((s) => [s.stepKey, s]));
    if (FINANCIAL_SUB_STEPS.some((k) => !stepsByKey[k]?.schemaValidationPassed || !stepsByKey[k]?.parsedOutputJson)) return null;

    const liq = stepsByKey.financial_liquidity?.parsedOutputJson as { liquidity_plan?: unknown; sources_used?: string[] } | undefined;
    const prof = stepsByKey.financial_profitability?.parsedOutputJson as { profitability_plan?: unknown; sources_used?: string[] } | undefined;
    const cap = stepsByKey.financial_capital?.parsedOutputJson as { capital_requirements?: unknown; sources_used?: string[] } | undefined;
    const be = stepsByKey.financial_break_even?.parsedOutputJson as { break_even_analysis?: unknown; sources_used?: string[] } | undefined;
    const h1 = stepsByKey.financial_monthly_h1?.parsedOutputJson as { monthly_projection?: unknown[]; sources_used?: string[] } | undefined;
    const h2 = stepsByKey.financial_monthly_h2?.parsedOutputJson as { monthly_projection?: unknown[]; sources_used?: string[] } | undefined;

    const monthlyProj = [...(h1?.monthly_projection ?? []), ...(h2?.monthly_projection ?? [])];
    const allSources = [...(liq?.sources_used ?? []), ...(prof?.sources_used ?? []), ...(cap?.sources_used ?? []), ...(be?.sources_used ?? []), ...(h1?.sources_used ?? []), ...(h2?.sources_used ?? [])];
    const uniqueSources = [...new Set(allSources)];

    const merged: Record<string, unknown> = {
      liquidity_plan: liq?.liquidity_plan ?? {},
      profitability_plan: prof?.profitability_plan ?? {},
      capital_requirements: cap?.capital_requirements ?? {},
      break_even_analysis: be?.break_even_analysis ?? {},
      monthly_projection: monthlyProj,
      recommendations: [],
      sources_used: uniqueSources,
    };

    const parsed = financialPlanningSchema.safeParse(merged);
    return parsed.success ? (parsed.data as Record<string, unknown>) : null;
  },

  async saveKpiAnswersStep(params: {
    runId: string;
    answers: string[];
    mapping_to_kpi_keys: string[];
  }) {
    const payload = { answers: params.answers, mapping_to_kpi_keys: params.mapping_to_kpi_keys };
    const validation = kpiAnswersSchema.safeParse(payload);
    if (!validation.success) {
      throw new Error(`Invalid KPI answers: ${validation.error.message}`);
    }
    const userResponse = JSON.stringify(validation.data);
    const existing = await prisma.runStep.findFirst({
      where: { runId: params.runId, stepKey: "kpi_questions_answer" },
    });
    if (existing) {
      return prisma.runStep.update({
        where: { id: existing.id },
        data: {
          userPastedResponse: userResponse,
          parsedOutputJson: validation.data as object,
          schemaValidationPassed: true,
          validationErrorsJson: undefined,
        },
      });
    }
    return prisma.runStep.create({
      data: {
        runId: params.runId,
        stepKey: "kpi_questions_answer",
        promptRendered: "(form step – KPI questions answered)",
        userPastedResponse: userResponse,
        parsedOutputJson: validation.data as object,
        schemaValidationPassed: true,
      },
    });
  },

  async updateStep(params: {
    stepId: string;
    schemaKey: SchemaKey;
    userResponse: string;
  }) {
    const validation = validateStrictJson(params.userResponse, params.schemaKey);
    const step = await prisma.runStep.findUnique({ where: { id: params.stepId }, include: { run: true } });
    if (!step?.run) return null;

    const updated = await prisma.runStep.update({
      where: { id: params.stepId },
      data: {
        userPastedResponse: params.userResponse,
        parsedOutputJson: validation.ok ? (validation.data as object) : undefined,
        schemaValidationPassed: validation.ok,
        validationErrorsJson: validation.ok ? undefined : (validation.errors as object),
      },
    });

    if (validation.ok) {
      const run = step.run;
      const strategyIndicatorPayload =
        validation.data && typeof validation.data === "object"
          ? (validation.data as Record<string, unknown>).strategy_indicators
          : undefined;
      const strategyIndicators = normalizeStrategyIndicatorMap(strategyIndicatorPayload);
      if (Object.keys(strategyIndicators).length > 0) {
        await saveStrategyIndicatorValues({
          companyId: run.companyId,
          runId: run.id,
          runStepId: updated.id,
          workflowKey: run.workflowKey,
          stepKey: step.stepKey,
          indicators: strategyIndicators,
        });
      }
      if (step.stepKey === "business_model_inference") {
        const parsed = businessModelInferenceSchema.safeParse(validation.data);
        if (parsed.success) {
          const validTypes = ["saas", "ecom", "local", "services", "marketplace", "mixed"] as const;
          const validStages = ["pre_revenue", "early_revenue", "growth", "scaling"] as const;
          const typeNorm = String(parsed.data.business_model_type || "").toLowerCase().trim();
          const businessType = typeNorm && validTypes.includes(typeNorm as typeof validTypes[number]) ? (typeNorm as typeof validTypes[number]) : "mixed";
          const stageNorm = parsed.data.stage.toLowerCase().replace(/[\s-]/g, "_");
          const stage = validStages.includes(stageNorm as typeof validStages[number]) ? (stageNorm as typeof validStages[number]) : "early_revenue";
          await prisma.company.update({
            where: { id: run.companyId },
            data: { inferredBusinessModelType: businessType, inferredConfidence: parsed.data.confidence, stageGuess: stage, stageConfidence: parsed.data.stage_confidence },
          });
        }
      } else if (step.stepKey === "kpi_set_selection") {
        const parsed = kpiSetSelectionSchema.safeParse(validation.data);
        if (parsed.success) {
          const latest = await prisma.companyKpiSet.findFirst({ where: { companyId: run.companyId }, orderBy: { version: "desc" } });
          await prisma.companyKpiSet.create({
            data: { companyId: run.companyId, version: (latest?.version ?? 0) + 1, selectedKpisJson: parsed.data.selected_kpis as object, kpiTreeJson: parsed.data.kpi_tree as object, rationaleJson: { rationale: parsed.data.rationale } as object },
          });
        }
      } else if (step.stepKey === "kpi_gap_scan") {
        const parsed = kpiGapReportSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: { companyId: run.companyId, runId: run.id, type: "baseline", title: "Baseline KPI Gap Report", version: 1, contentJson: parsed.data as object, exportHtml: this.renderBaselineHtml(parsed.data) },
          });
        }
      } else if (step.stepKey === "industry_research") {
        const parsed = industryResearchSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "industry_research",
              title: "Industry & Location Data",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderIndustryResearchHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "market_snapshot") {
        const parsed = marketSnapshotSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: { companyId: run.companyId, runId: run.id, type: "market", title: "Market Snapshot", version: 1, contentJson: parsed.data as object, exportHtml: this.renderMarketHtml(parsed.data) },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "decision_engine" && params.schemaKey === "decision_pack") {
        const parsed = decisionPackSchema.safeParse(validation.data);
        if (parsed.success) await this.createDecisionsFromPack(run.companyId, run.id, parsed.data);
      } else if (step.stepKey === "root_cause_trees") {
        const parsed = rootCauseTreesSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: $Enums.ArtifactType.diagnostic,
              title: "Root Cause Trees",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderDiagnosticHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "kpi_computation_plan" && params.schemaKey === "kpi_questions") {
        const parsed = kpiQuestionsSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "data_collection_plan",
              title: "KPI Computation Plan",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderDataCollectionPlanHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "kpi_estimation") {
        const parsed = kpiEstimationSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "kpi_estimation",
              title: "KPI Estimation",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderKpiEstimationHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "market_research") {
        const parsed = marketResearchSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "market_research",
              title: "Market Research",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderMarketResearchHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "best_practices") {
        const parsed = bestPracticesSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "best_practices",
              title: "Best Practices",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderBestPracticesHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "failure_reasons") {
        const parsed = failureReasonsSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "failure_analysis",
              title: "Why Businesses Fail",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderFailureReasonsHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "business_plan_risk") {
        const fullRun = await prisma.run.findUnique({
          where: { id: run.id },
          include: { steps: true },
        });
        if (fullRun) {
          const execStep = fullRun.steps.find((s) => s.stepKey === "business_plan_executive");
          const marketStep = fullRun.steps.find((s) => s.stepKey === "business_plan_market");
          const marketingStep = fullRun.steps.find((s) => s.stepKey === "business_plan_marketing");
          const financialStep = fullRun.steps.find((s) => s.stepKey === "business_plan_financial");
          const riskStep = fullRun.steps.find((s) => s.stepKey === "business_plan_risk");
          const exec = execStep?.schemaValidationPassed && execStep.parsedOutputJson
            ? businessPlanSectionSchema.safeParse(execStep.parsedOutputJson)
            : { success: false as const };
          const market = marketStep?.schemaValidationPassed && marketStep.parsedOutputJson
            ? businessPlanSectionSchema.safeParse(marketStep.parsedOutputJson)
            : { success: false as const };
          const marketing = marketingStep?.schemaValidationPassed && marketingStep.parsedOutputJson
            ? businessPlanSectionSchema.safeParse(marketingStep.parsedOutputJson)
            : { success: false as const };
          const financial = financialStep?.schemaValidationPassed && financialStep.parsedOutputJson
            ? businessPlanSchema.safeParse(financialStep.parsedOutputJson)
            : { success: false as const };
          const risk = riskStep?.schemaValidationPassed && validation.data
            ? businessPlanSectionSchema.safeParse(validation.data)
            : { success: false as const };
          if (exec.success && market.success && marketing.success && financial.success && risk.success) {
            const fpArtifact = await prisma.artifact.findFirst({
              where: { companyId: run.companyId, type: "financial_planning" },
              orderBy: { createdAt: "desc" },
            });
            const fpContent = fpArtifact?.contentJson as { monthly_projection?: unknown[] } | null;
            const monthlyProj = (fpContent?.monthly_projection?.length ? fpContent.monthly_projection : financial.data.monthly_projection) ?? financial.data.monthly_projection;
            const merged = {
              executive_summary: exec.data,
              market_analysis: market.data,
              marketing_plan: marketing.data,
              financial_scenarios: financial.data,
              management_team: financial.data.management_team,
              legal_structure: financial.data.legal_structure,
              capital_requirements_summary: financial.data.capital_requirements_summary,
              monthly_projection: monthlyProj,
              risk_analysis: risk.data,
            };
            const existing = await prisma.artifact.findFirst({
              where: { runId: run.id, type: "business_plan" },
            });
            if (existing) {
              await prisma.artifact.update({
                where: { id: existing.id },
                data: {
                  contentJson: merged as object,
                  exportHtml: this.renderBusinessPlanMultiSectionHtml(merged as { executive_summary?: { content: string; key_points?: string[] }; market_analysis?: { content: string; key_points?: string[] }; marketing_plan?: { content: string; key_points?: string[] }; monthly_projection?: { month: string; revenue?: number; total_costs?: number; net?: number }[]; [key: string]: unknown }),
                },
              });
            } else {
              await prisma.artifact.create({
                data: {
                  companyId: run.companyId,
                  runId: run.id,
                  type: "business_plan",
                  title: "Business Plan",
                  version: 1,
                  contentJson: merged as object,
                  exportHtml: this.renderBusinessPlanMultiSectionHtml(merged as { executive_summary?: { content: string; key_points?: string[] }; market_analysis?: { content: string; key_points?: string[] }; marketing_plan?: { content: string; key_points?: string[] }; monthly_projection?: { month: string; revenue?: number; total_costs?: number; net?: number }[]; [key: string]: unknown }),
                },
              });
              await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
            }
          }
        }
      } else if (step.stepKey === "menu_card") {
        const parsed = menuCardSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: $Enums.ArtifactType.menu_card,
              title: "Menu Card",
              version: 1,
              contentJson: toPrismaJson(parsed.data),
              exportHtml: this.renderMenuCardHtml(parsed.data),
            },
          });
          if (run.workflowKey !== "WF_MENU_PRICING") await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "supplier_list") {
        const parsed = supplierListSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "supplier_list",
              title: "Supplier List",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderSupplierListHtml(parsed.data),
            },
          });
          if (run.workflowKey !== "WF_MENU_PRICING") await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "menu_cost") {
        const parsed = menuCostSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: $Enums.ArtifactType.menu_cost,
              title: "Warenkosten",
              version: 1,
              contentJson: toPrismaJson(parsed.data),
              exportHtml: this.renderMenuCostHtml(parsed.data),
            },
          });
          if (run.workflowKey !== "WF_MENU_PRICING") await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "menu_preiskalkulation") {
        const parsed = menuPreiskalkulationSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: $Enums.ArtifactType.menu_preiskalkulation,
              title: "Preiskalkulation",
              version: 1,
              contentJson: toPrismaJson(parsed.data),
              exportHtml: this.renderMenuPreiskalkulationHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "real_estate") {
        const parsed = realEstateSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "real_estate",
              title: "Real Estate Options",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderRealEstateHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "startup_consulting") {
        const parsed = startupConsultingSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "startup_guide",
              title: "Funding",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderStartupConsultingHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "customer_validation") {
        const parsed = customerValidationSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "customer_validation",
              title: "Customer Validation",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderCustomerValidationHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "process_optimization") {
        const parsed = processOptimizationSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "process_optimization",
              title: "Process Optimization",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderProcessOptimizationHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "strategic_options") {
        const parsed = strategicOptionsSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "strategic_options",
              title: "Strategic Options",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderStrategicOptionsHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "hr_planning") {
        const parsed = hrPlanningSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "hr_planning",
              title: "HR Planning",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderHrPlanningHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "value_proposition") {
        const parsed = valuePropositionSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: $Enums.ArtifactType.value_proposition,
              title: "Value Proposition & Problem-Solution-Fit",
              version: 1,
              contentJson: toPrismaJson(parsed.data),
              exportHtml: this.renderValuePropositionHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "go_to_market") {
        const parsed = goToMarketSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "go_to_market",
              title: "Go-to-Market & Pricing",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderGoToMarketHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "marketing_strategy") {
        const parsed = marketingStrategySchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "marketing_strategy",
            title: "Marketing Strategie",
            contentJson: parsed.data as object,
            exportHtml: this.renderMarketingStrategyHtml(parsed.data),
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "scaling_strategy") {
        const parsed = scalingStrategySchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "scaling_strategy",
              title: "Scaling Strategy",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderScalingStrategyHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "portfolio_management") {
        const parsed = portfolioManagementSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "portfolio_management",
              title: "Portfolio & Brand Strategy",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderPortfolioManagementHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "scenario_analysis") {
        const parsed = scenarioAnalysisSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "scenario_analysis",
              title: "Scenario & Risk Analysis",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderScenarioAnalysisHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "operative_plan") {
        const parsed = operativePlanSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "operative_plan",
              title: "Operative Plan",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderOperativePlanHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "swot_analysis") {
        const parsed = swotAnalysisSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "swot_analysis",
              title: "SWOT-Analyse",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderSwotAnalysisHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "work_processes") {
        const parsed = workProcessesSchema.safeParse(validation.data);
        if (parsed.success) {
          const existing = await prisma.artifact.findFirst({
            where: { runId: run.id, type: "work_processes" },
          });
          const content = {
            contentJson: toPrismaJson(parsed.data),
            exportHtml: this.renderWorkProcessesHtml(parsed.data),
          };
          if (existing) {
            await prisma.artifact.update({ where: { id: existing.id }, data: content });
          } else {
            await createWorkProcessesArtifact({
              companyId: run.companyId,
              runId: run.id,
              title: "Arbeitsprozesse (Planung → Einkauf → Endkunde)",
              contentJson: content.contentJson,
              exportHtml: content.exportHtml ?? "",
            });
          }
        }
      } else if (step.stepKey === "personnel_plan") {
        const parsed = personnelPlanSchema.safeParse(validation.data);
        if (parsed.success) {
          const artifactData = {
            companyId: run.companyId,
            runId: run.id,
            type: "personnel_plan" as const,
            title: "Personalplan Jahr 1",
            version: 1,
            contentJson: parsed.data as object,
          };
          try {
            await prisma.artifact.create({ data: artifactData });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Artifact create failed (personnel_plan): ${msg}`);
          }
        }
      } else if (step.stepKey === "financial_planning") {
        const parsed = financialPlanningSchema.safeParse(validation.data);
        if (parsed.success) {
          let content = parsed.data;
          const realEstateArtifact = await prisma.artifact.findFirst({
            where: { companyId: run.companyId, type: "real_estate" },
            orderBy: { createdAt: "desc" },
          });
          const realEstate = realEstateArtifact?.contentJson as Record<string, unknown> | null;
          const miete = parseMieteFromRealEstate(realEstate);
          if (miete != null) content = applyMieteFromRealEstate(content, miete);
          const personnelPlanArtifact = await prisma.artifact.findFirst({
            where: { companyId: run.companyId, type: "personnel_plan" },
            orderBy: { createdAt: "desc" },
          });
          const personnelPlan = personnelPlanArtifact?.contentJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null;
          const personnelStep = (run as { steps?: Array<{ stepKey: string; parsedOutputJson: unknown }> }).steps?.find((s: { stepKey: string }) => s.stepKey === "personnel_plan");
          const personnelData = (personnelStep?.parsedOutputJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null) ?? personnelPlan;
          if (personnelData?.monthly_personnel_costs?.length) {
            content = applyPersonnelFromPersonnelPlan(content, personnelData.monthly_personnel_costs);
          }
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "financial_planning",
              title: "Finanzplanung",
              version: 1,
              contentJson: content as object,
              exportHtml: this.renderFinancialPlanningHtml(content),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (FINANCIAL_SUB_STEPS.includes(step.stepKey as (typeof FINANCIAL_SUB_STEPS)[number])) {
        const runWithSteps = await prisma.run.findUnique({ where: { id: run.id }, include: { steps: true } });
        const merged = runWithSteps ? await this.tryMergeFinancialPlanningSteps(runWithSteps) : null;
        if (merged) {
          let content = merged;
          const realEstateArtifact = await prisma.artifact.findFirst({
            where: { companyId: run.companyId, type: "real_estate" },
            orderBy: { createdAt: "desc" },
          });
          const realEstate = realEstateArtifact?.contentJson as Record<string, unknown> | null;
          const miete = parseMieteFromRealEstate(realEstate);
          if (miete != null) content = applyMieteFromRealEstate(content, miete);
          const personnelPlanArtifact = await prisma.artifact.findFirst({
            where: { companyId: run.companyId, type: "personnel_plan" },
            orderBy: { createdAt: "desc" },
          });
          const personnelPlan = personnelPlanArtifact?.contentJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null;
          const personnelStep = (run as { steps?: Array<{ stepKey: string; parsedOutputJson: unknown }> }).steps?.find((s: { stepKey: string }) => s.stepKey === "personnel_plan");
          const personnelData = (personnelStep?.parsedOutputJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null) ?? personnelPlan;
          if (personnelData?.monthly_personnel_costs?.length) {
            content = applyPersonnelFromPersonnelPlan(content, personnelData.monthly_personnel_costs);
          }
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "financial_planning",
              title: "Finanzplanung",
              version: 1,
              contentJson: content as object,
              exportHtml: this.renderFinancialPlanningHtml(content),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "strategic_planning") {
        const parsed = strategicPlanningSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "strategic_planning",
              title: "Strategische Planung",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderStrategicPlanningHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "competitor_analysis") {
        const parsed = competitorAnalysisSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "competitor_analysis",
              title: "Wettbewerbsanalyse",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderCompetitorAnalysisHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "trend_analysis") {
        const parsed = trendAnalysisSchema.safeParse(validation.data);
        if (parsed.success) {
          await prisma.artifact.create({
            data: {
              companyId: run.companyId,
              runId: run.id,
              type: "trend_analysis",
              title: "Trendanalyse",
              version: 1,
              contentJson: parsed.data as object,
              exportHtml: this.renderTrendAnalysisHtml(parsed.data),
            },
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "tech_digitalization") {
        const { techDigitalizationSchema } = await import("@/types/schemas");
        const parsed = techDigitalizationSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "tech_digitalization",
            title: "Technologie & Digitalisierung",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "automation_roi") {
        const { automationRoiSchema } = await import("@/types/schemas");
        const parsed = automationRoiSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "automation_roi",
            title: "Computer-Automatisierung & ROI",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "physical_automation") {
        const { physicalAutomationSchema } = await import("@/types/schemas");
        const parsed = physicalAutomationSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "physical_automation",
            title: "Physische Prozess-Automatisierung",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      } else if (step.stepKey === "app_ideas") {
        const { appProjectPlanSchema } = await import("@/types/schemas");
        const parsed = appProjectPlanSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "app_project_plan",
            title: "App-Projektplan",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
        }
      } else if (step.stepKey === "app_requirements") {
        const { appRequirementsSchema } = await import("@/types/schemas");
        const parsed = appRequirementsSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "app_requirements",
            title: "App-Requirements",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
        }
      } else if (step.stepKey === "app_tech_spec") {
        const { appTechSpecSchema } = await import("@/types/schemas");
        const parsed = appTechSpecSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "app_tech_spec",
            title: "App-Technische Spezifikation",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
        }
      } else if (step.stepKey === "app_mvp_guide") {
        const { appMvpGuideSchema } = await import("@/types/schemas");
        const parsed = appMvpGuideSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "app_mvp_guide",
            title: "App-MVP-Anleitung",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
        }
      } else if (step.stepKey === "app_page_specs") {
        const { appPageSpecsSchema } = await import("@/types/schemas");
        const parsed = appPageSpecsSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "app_page_specs",
            title: "App-Seiten-Spezifikation",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
        }
      } else if (step.stepKey === "app_db_schema") {
        const { appDbSchemaSchema } = await import("@/types/schemas");
        const parsed = appDbSchemaSchema.safeParse(validation.data);
        if (parsed.success) {
          await createArtifactWithEnumFallback({
            companyId: run.companyId,
            runId: run.id,
            type: "app_db_schema",
            title: "App-Datenbank-Schema",
            contentJson: parsed.data as object,
            exportHtml: null,
          });
          await prisma.run.update({ where: { id: run.id }, data: { status: "complete" } });
        }
      }
    }
    return updated;
  },

  async createDecisionsFromPack(
    companyId: string,
    runId: string,
    pack: {
      decision_proposals: Array<Record<string, unknown>>;
      execution_plan_30_60_90?: Record<string, unknown>;
      guardrails?: unknown[];
      assumption_register?: unknown[];
      citations_json?: Record<string, string[]>;
    }
  ) {
    const artifact = await prisma.artifact.create({
      data: {
        companyId,
        runId,
        type: "decision_pack",
        title: "Decision Pack",
        version: 1,
        contentJson: pack as object,
        exportHtml: this.renderDecisionPackHtml(pack),
      },
    });

    for (let i = 0; i < pack.decision_proposals.length; i++) {
      const p = pack.decision_proposals[i] as Record<string, unknown>;
      const evidence = (pack.citations_json ?? {}) as Record<string, string[]>;
      const evidenceData = {
        kpi_keys: evidence.kpi_keys ?? [],
        artifact_ids: [artifact.id, ...(evidence.artifact_ids ?? [])],
        source_ids: evidence.source_ids ?? [],
        knowledge_object_ids: evidence.knowledge_object_ids ?? [],
      };
      await prisma.decision.create({
        data: {
          companyId,
          runId,
          decisionKey: `DP-${String(i + 1).padStart(3, "0")}`,
          title: String(p.title ?? `Decision ${i + 1}`),
          lever: (["acquisition", "conversion", "monetization", "retention", "margin", "ops", "finance"].includes(String(p.lever)) ? String(p.lever) : "acquisition") as "acquisition" | "conversion" | "monetization" | "retention" | "margin" | "ops" | "finance",
          decisionJson: p as object,
          scoringJson: ((p as Record<string, unknown>).kpi_impact_range ?? {}) as object,
          evidenceJson: evidenceData as object,
        },
      });
    }

    await prisma.run.update({
      where: { id: runId },
      data: { status: "complete" },
    });
  },

  renderIndustryResearchHtml(data: { industry?: string; location?: string; key_trends?: string[]; competitors?: string[]; key_facts?: Array<{ fact: string; source_hint?: string }> }) {
    const trends = data.key_trends ?? [];
    const competitors = data.competitors ?? [];
    const facts = data.key_facts ?? [];
    return `
      <h3>Industry & Location</h3>
      <p><strong>${data.industry ?? "—"}</strong> · ${data.location ?? "—"}</p>
      <h3>Key Trends</h3>
      <ul>${trends.map((t) => `<li>${t}</li>`).join("")}</ul>
      <h3>Competitors</h3>
      <ul>${competitors.map((c) => `<li>${c}</li>`).join("")}</ul>
      <h3>Key Facts</h3>
      <ul>${facts.map((f) => `<li>${f.fact}${f.source_hint ? ` <em>(${f.source_hint})</em>` : ""}</li>`).join("")}</ul>
    `;
  },

  renderBaselineHtml(data: { kpi_table?: unknown[]; top_gaps?: unknown[]; data_quality_alerts?: string[] }) {
    const gaps = (data.top_gaps ?? []).slice(0, 5);
    const alerts = data.data_quality_alerts ?? [];
    return `
      <h3>Top KPI Gaps</h3>
      <ul>${gaps.map((g: unknown) => `<li>${JSON.stringify(g)}</li>`).join("")}</ul>
      <h3>Data Quality Alerts</h3>
      <ul>${alerts.map((a) => `<li>${a}</li>`).join("")}</ul>
    `;
  },

  renderDecisionPackHtml(pack: { decision_proposals?: Array<Record<string, unknown>>; execution_plan_30_60_90?: Record<string, unknown> }) {
    const proposals = (pack.decision_proposals ?? []).slice(0, 5);
    const plan = pack.execution_plan_30_60_90 ?? {};
    return `
      <h3>Top Decisions</h3>
      <ol>${proposals.map((p) => `<li><strong>${p.title ?? "—"}</strong>: ${(p.founder_simple_summary as string) ?? ""}</li>`).join("")}</ol>
      <h3>30/60/90 Plan</h3>
      <pre>${JSON.stringify(plan, null, 2)}</pre>
    `;
  },

  renderMarketHtml(data: { segments?: unknown[]; competitors?: unknown[]; demand_drivers?: string[] }) {
    const segments = (data.segments ?? []).slice(0, 5);
    const competitors = (data.competitors ?? []).slice(0, 5);
    const drivers = data.demand_drivers ?? [];
    return `
      <h3>Segments</h3>
      <ul>${segments.map((s: unknown) => `<li>${JSON.stringify(s)}</li>`).join("")}</ul>
      <h3>Competitors</h3>
      <ul>${competitors.map((c: unknown) => `<li>${JSON.stringify(c)}</li>`).join("")}</ul>
      <h3>Demand Drivers</h3>
      <ul>${drivers.map((d) => `<li>${d}</li>`).join("")}</ul>
    `;
  },

  renderKpiEstimationHtml(data: { kpi_estimates?: Array<{ kpi_key: string; value?: unknown; value_month_1?: unknown; value_month_12?: unknown; unit?: string; confidence?: number; rationale?: string }> }) {
    const estimates = data.kpi_estimates ?? [];
    const fmt = (e: (typeof estimates)[0]) => {
      const v1 = e.value_month_1 ?? e.value;
      const v12 = e.value_month_12 ?? e.value;
      const u = e.unit ?? "";
      if (v1 != null && v12 != null && v1 !== v12) {
        return `${v1} ${u} → ${v12} ${u}`;
      }
      return `${v1 ?? "—"} ${u}`;
    };
    return `
      <h3>KPI Prognosen (Monat 1 → Monat 12)</h3>
      <ul>${estimates.map((e) => `<li><strong>${e.kpi_key}</strong>: ${fmt(e)} (${Math.round((e.confidence ?? 0) * 100)}%) – ${e.rationale ?? ""}</li>`).join("")}</ul>
    `;
  },

  renderWorkProcessesHtml(data: { process_chain?: Array<{ phase?: string; name?: string; description?: string; responsible_role?: string; duration_estimate?: string }>; summary?: string; recommendations?: string[] }) {
    const chain = data.process_chain ?? [];
    const summary = data.summary ?? "";
    const recs = data.recommendations ?? [];
    return `
      <h3>Arbeitsprozesse (Planung → Einkauf → Endkunde)</h3>
      ${summary ? `<p>${summary}</p>` : ""}
      <ol>${chain.map((p) => `<li><strong>${p.phase ?? p.name ?? ""}</strong>: ${p.description ?? ""}${p.responsible_role ? ` (Rolle: ${p.responsible_role})` : ""}${p.duration_estimate ? ` (${p.duration_estimate})` : ""}</li>`).join("")}</ol>
      ${recs.length > 0 ? `<h4>Empfehlungen</h4><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderMarketResearchHtml(data: Record<string, unknown>) {
    const base = this.renderMarketHtml(data);
    const buyer = (data.buyer_behavior as Array<{ segment_or_trait?: string; behavior?: string }>) ?? [];
    const sd = data.supply_demand as { supply_overview?: string; demand_overview?: string; balance_assessment?: string } | undefined;
    const feas = data.feasibility_assessment as { is_makeable?: boolean; recommendation?: string; rationale?: string; key_blockers?: string[] } | undefined;
    const brd = (data.business_research_data as Array<{ source_type?: string; description?: string; key_findings?: string[] }>) ?? [];
    let extra = "";
    if (buyer.length > 0) {
      extra += `<h3>Kaufverhalten (Buyer Behavior)</h3><ul>${buyer.map((b) => `<li><strong>${b.segment_or_trait ?? ""}</strong>: ${b.behavior ?? ""}</li>`).join("")}</ul>`;
    }
    if (sd) {
      extra += `<h3>Angebot & Nachfrage</h3><p>Supply: ${sd.supply_overview ?? ""}</p><p>Demand: ${sd.demand_overview ?? ""}</p><p>Balance: ${sd.balance_assessment ?? ""}</p>`;
    }
    if (feas) {
      extra += `<h3>Feasibility</h3><p>Makeable: ${feas.is_makeable ? "Yes" : "No"} | Recommendation: ${feas.recommendation ?? ""}</p><p>${feas.rationale ?? ""}</p>${(feas.key_blockers ?? []).length ? `<p>Blockers: ${(feas.key_blockers ?? []).join(", ")}</p>` : ""}`;
    }
    if (brd.length > 0) {
      extra += `<h3>Business Research (Northdata-like)</h3><ul>${brd.map((b) => `<li>${b.source_type ?? ""}: ${b.description ?? ""} — ${(b.key_findings ?? []).join("; ")}</li>`).join("")}</ul>`;
    }
    return base + extra;
  },

  renderBusinessPlanMultiSectionHtml(data: {
    executive_summary?: { content: string; key_points?: string[] };
    market_analysis?: { content: string; key_points?: string[] };
    marketing_plan?: { content: string; key_points?: string[] };
    financial_scenarios?: { worst_case?: Record<string, unknown>; best_case?: Record<string, unknown>; realistic_case?: Record<string, unknown>; business_research_data?: unknown[] };
    management_team?: { content: string; key_points?: string[] };
    legal_structure?: { content: string; key_points?: string[] };
    capital_requirements_summary?: string;
    monthly_projection?: Array<{ month: string; revenue?: number; total_costs?: number; net?: number }>;
    risk_analysis?: { content: string; key_points?: string[] };
  }) {
    const exec = data.executive_summary?.content ?? "";
    const market = data.market_analysis?.content ?? "";
    const marketing = data.marketing_plan?.content ?? "";
    const risk = data.risk_analysis?.content ?? "";
    const fin = data.financial_scenarios ?? {};
    const w = fin.worst_case ?? {};
    const b = fin.best_case ?? {};
    const r = fin.realistic_case ?? {};
    const brd = (fin.business_research_data ?? []) as Array<{ source_type?: string; description?: string }>;
    const mgmt = data.management_team?.content ?? "";
    const legal = data.legal_structure?.content ?? "";
    const capital = data.capital_requirements_summary ?? "";
    const monthly = data.monthly_projection ?? [];
    const monthlyRows = monthly.length > 0
      ? `<table><tr><th>Monat</th><th>Umsatz</th><th>Kosten</th><th>Netto</th></tr>${monthly.map((m) => `<tr><td>${m.month}</td><td>${m.revenue ?? "—"}</td><td>${m.total_costs ?? "—"}</td><td>${m.net ?? "—"}</td></tr>`).join("")}</table>`
      : "";
    return `
      <h3>Executive Summary</h3>
      <p>${exec}</p>
      <h3>Market Analysis</h3>
      <p>${market}</p>
      <h3>Marketing Plan</h3>
      <p>${marketing}</p>
      <h3>Financial Scenarios</h3>
      <p>Worst: ${w.revenue_min ?? "—"} | Best: ${b.revenue_max ?? "—"} | Realistic: ${r.revenue_expected ?? "—"}</p>
      ${capital ? `<h3>Kapitalbedarf</h3><p>${capital}</p>` : ""}
      ${mgmt ? `<h3>Management & Team</h3><p>${mgmt}</p>` : ""}
      ${legal ? `<h3>Rechtsform</h3><p>${legal}</p>` : ""}
      ${monthlyRows ? `<h3>Monatsprognose</h3>${monthlyRows}` : ""}
      <h3>Risk Analysis</h3>
      <p>${risk}</p>
      ${brd.length ? `<h3>Business Research</h3><ul>${brd.map((x) => `<li>${x.source_type ?? ""}: ${x.description ?? ""}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderBusinessPlanHtml(data: { worst_case?: Record<string, unknown>; best_case?: Record<string, unknown>; realistic_case?: Record<string, unknown>; business_research_data?: unknown[] }) {
    const w = data.worst_case ?? {};
    const b = data.best_case ?? {};
    const r = data.realistic_case ?? {};
    const brd = (data.business_research_data ?? []) as Array<{ source_type?: string; description?: string; key_findings?: string[] }>;
    return `
      <h3>Worst Case (Minimal Revenue)</h3>
      <p>Revenue: ${w.revenue_min ?? "—"} | ${w.revenue_description ?? ""}</p>
      <p>Assumptions: ${Array.isArray(w.assumptions) ? w.assumptions.join(", ") : ""}</p>
      <p>Risks: ${Array.isArray(w.risks) ? w.risks.join(", ") : ""}</p>
      <h3>Best Case (Maximum Revenue)</h3>
      <p>Revenue: ${b.revenue_max ?? "—"} | ${b.revenue_description ?? ""}</p>
      <p>Assumptions: ${Array.isArray(b.assumptions) ? b.assumptions.join(", ") : ""}</p>
      <p>Enablers: ${Array.isArray(b.enablers) ? b.enablers.join(", ") : ""}</p>
      <h3>Realistic Case</h3>
      <p>Revenue: ${r.revenue_expected ?? "—"} | ${r.revenue_description ?? ""}</p>
      <p>Assumptions: ${Array.isArray(r.assumptions) ? r.assumptions.join(", ") : ""}</p>
      ${brd.length ? `<h3>Business Research Data</h3><ul>${brd.map((x) => `<li>${x.source_type ?? ""}: ${x.description ?? ""}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderDiagnosticHtml(data: { root_cause_trees?: unknown[] }) {
    const trees = (data.root_cause_trees ?? []).slice(0, 5);
    return `
      <h3>Root Cause Trees</h3>
      <ul>${trees.map((t: unknown) => `<li>${JSON.stringify(t)}</li>`).join("")}</ul>
    `;
  },

  renderDataCollectionPlanHtml(data: { questions_simple?: string[]; mapping_to_kpi_keys?: string[] }) {
    const questions = data.questions_simple ?? [];
    const mapping = data.mapping_to_kpi_keys ?? [];
    return `
      <h3>Questions</h3>
      <ol>${questions.map((q) => `<li>${q}</li>`).join("")}</ol>
      <h3>KPI Mapping</h3>
      <ul>${mapping.map((m) => `<li>${m}</li>`).join("")}</ul>
    `;
  },

  renderBestPracticesHtml(data: { practices?: Array<{ name: string; description: string; rationale?: string }>; industry_specific?: string[] }) {
    const practices = data.practices ?? [];
    const industry = data.industry_specific ?? [];
    return `
      <h3>Best Practices</h3>
      <ul>${practices.map((p) => `<li><strong>${p.name}</strong>: ${p.description}${p.rationale ? ` <em>(${p.rationale})</em>` : ""}</li>`).join("")}</ul>
      ${industry.length ? `<h3>Industry-Specific</h3><ul>${industry.map((i) => `<li>${i}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderFailureReasonsHtml(data: { failure_reasons?: Array<{ reason: string; frequency?: string; mitigation?: string }>; industry_risks?: string[] }) {
    const reasons = data.failure_reasons ?? [];
    const risks = data.industry_risks ?? [];
    return `
      <h3>Failure Reasons</h3>
      <ul>${reasons.map((r) => `<li><strong>${r.reason}</strong>${r.frequency ? ` (${r.frequency})` : ""}${r.mitigation ? ` — Mitigation: ${r.mitigation}` : ""}</li>`).join("")}</ul>
      ${risks.length ? `<h3>Industry Risks</h3><ul>${risks.map((i) => `<li>${i}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderMenuCardHtml(data: {
    menu_intro?: { items?: Array<{ name: string; description?: string; price?: string }> };
    menu_full?: { items?: Array<{ name: string; category?: string; description?: string; components?: Array<{ name: string; quantity?: string; unit?: string }>; price?: string }> };
  }) {
    const intro = data.menu_intro?.items ?? [];
    const items = data.menu_full?.items ?? [];
    const introHtml = intro.length > 0
      ? `<h3>Intro (Einführung)</h3><ul>${intro.map((i) => `<li><strong>${i.name}</strong>${i.description ? ` — ${i.description}` : ""}${i.price ? ` (${i.price})` : ""}</li>`).join("")}</ul>`
      : "";
    const fullHtml = items.length > 0
      ? `<h3>Vollständiges Angebot (mit Komponenten)</h3>${items.map((d) => {
          const compList = (d.components ?? []).map((c) => `${c.name}${c.quantity ? ` ${c.quantity}${c.unit ?? ""}` : ""}`).join(", ");
          return `<p><strong>${d.name}</strong>${d.category ? ` (${d.category})` : ""}${d.description ? ` — ${d.description}` : ""}${compList ? ` — Komponenten: ${compList}` : ""}${d.price ? ` (${d.price})` : ""}</p>`;
        }).join("")}`
      : "";
    return `${introHtml}${fullHtml}`;
  },

  renderSupplierListHtml(data: { suppliers?: Array<{ material: string; supplier?: string; price_per_unit?: number; unit?: string; notes?: string }> }) {
    const suppliers = data.suppliers ?? [];
    return `
      <h3>Suppliers</h3>
      <ul>${suppliers.map((s) => `<li><strong>${s.material}</strong>${s.supplier ? ` — ${s.supplier}` : ""}${s.price_per_unit != null ? ` (${s.price_per_unit} ${s.unit ?? ""})` : ""}${s.notes ? ` — ${s.notes}` : ""}</li>`).join("")}</ul>
    `;
  },

  renderMenuCostHtml(data: {
    items?: Array<{
      item_name: string;
      category?: string;
      components?: Array<{ component_name: string; quantity?: number | string; unit?: string; price_per_unit: number; cost: number }>;
      total_cost: number;
      selling_price?: number;
      margin_percent?: number;
      margin_note?: string;
    }>;
    summary?: { total_warenkosten: number; total_items: number; avg_cost_per_item?: number; recommendations?: string[] };
  }) {
    const items = data.items ?? [];
    const summary = data.summary ?? { total_warenkosten: 0, total_items: 0 };
    const rows = items.map((i) => {
      const margin = i.margin_percent != null ? `${i.margin_percent.toFixed(1)}%` : "—";
      return `<tr><td>${i.item_name}</td><td>${i.total_cost.toFixed(2)} €</td><td>${i.selling_price != null ? `${i.selling_price.toFixed(2)} €` : "—"}</td><td>${margin}</td></tr>`;
    }).join("");
    const recs = (summary.recommendations ?? []).map((r) => `<li>${r}</li>`).join("");
    return `
      <h3>Warenkosten</h3>
      <p><strong>Gesamt:</strong> ${summary.total_warenkosten.toFixed(2)} € (${summary.total_items} Positionen)</p>
      ${summary.avg_cost_per_item != null ? `<p>Ø pro Position: ${summary.avg_cost_per_item.toFixed(2)} €</p>` : ""}
      <table><thead><tr><th>Position</th><th>Kosten</th><th>Verkaufspreis</th><th>Marge</th></tr></thead><tbody>${rows}</tbody></table>
      ${recs ? `<h4>Empfehlungen</h4><ul>${recs}</ul>` : ""}
    `;
  },

  renderMenuPreiskalkulationHtml(data: {
    items?: Array<{ item_name: string; category?: string; cost: number; recommended_price: number; target_margin_percent: number; price_notes?: string }>;
    summary?: { pricing_strategy?: string; avg_margin_percent?: number; recommendations?: string[] };
  }) {
    const items = data.items ?? [];
    const summary = data.summary ?? {};
    const rows = items.map((i) =>
      `<tr><td>${i.item_name}</td><td>${i.cost.toFixed(2)} €</td><td>${i.recommended_price.toFixed(2)} €</td><td>${i.target_margin_percent.toFixed(1)}%</td><td>${i.price_notes ?? "—"}</td></tr>`
    ).join("");
    const recs = (summary.recommendations ?? []).map((r) => `<li>${r}</li>`).join("");
    return `
      <h3>Preiskalkulation</h3>
      ${summary.pricing_strategy ? `<p>${summary.pricing_strategy}</p>` : ""}
      ${summary.avg_margin_percent != null ? `<p>Ø Marge: ${summary.avg_margin_percent.toFixed(1)}%</p>` : ""}
      <table><thead><tr><th>Position</th><th>Kosten</th><th>Empf. Preis</th><th>Marge</th><th>Hinweise</th></tr></thead><tbody>${rows}</tbody></table>
      ${recs ? `<h4>Empfehlungen</h4><ul>${recs}</ul>` : ""}
    `;
  },

  renderRealEstateHtml(data: {
    options?: Array<{ type: string; location?: string; description: string; price_range?: string; suitability?: string; url?: string; usage_permit?: string }>;
    average_market_prices?: Array<{ property_type: string; avg_price: string; region?: string; notes?: string }>;
    best_option_index?: number;
    best_option_details?: { renovations?: string; usage_change_application?: string; other_applications?: string[] };
    recommendations?: string[];
  }) {
    const options = data.options ?? [];
    const avgPrices = data.average_market_prices ?? [];
    const bestIdx = data.best_option_index;
    const bestDetails = data.best_option_details;
    const recs = data.recommendations ?? [];
    const avgSection = avgPrices.length > 0
      ? `<h3>Durchschnittspreise vergleichbarer Objekte (Referenz)</h3><ul>${avgPrices.map((a) => `<li><strong>${a.property_type}</strong>: ${a.avg_price}${a.region ? ` (${a.region})` : ""}${a.notes ? ` — ${a.notes}` : ""}</li>`).join("")}</ul>`
      : "";
    const optList = options.map((o, i) => {
      const rawUrl = (o as { url?: string }).url;
      const href = rawUrl ? extractRealEstateUrl(rawUrl) : null;
      const link = href ? ` <a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">Anzeige öffnen →</a>` : "";
      const permit = (o as { usage_permit?: string }).usage_permit ? ` | Nutzungserlaubnis: ${(o as { usage_permit?: string }).usage_permit}` : "";
      const best = bestIdx === i ? " ★" : "";
      return `<li><strong>${o.type}</strong>${o.location ? ` — ${o.location}` : ""}: ${o.description}${o.price_range ? ` (${o.price_range})` : ""}${permit}${link}${best}</li>`;
    }).join("");
    let bestSection = "";
    if (bestDetails && (bestDetails.renovations || bestDetails.usage_change_application || (bestDetails.other_applications?.length ?? 0) > 0)) {
      bestSection = `
      <h3>Beste Option – Sanierungen & Anträge</h3>
      <ul>
        ${bestDetails.renovations ? `<li><strong>Sanierungen:</strong> ${bestDetails.renovations}</li>` : ""}
        ${bestDetails.usage_change_application ? `<li><strong>Nutzungsänderungsantrag:</strong> ${bestDetails.usage_change_application}</li>` : ""}
        ${(bestDetails.other_applications?.length ?? 0) > 0 ? `<li><strong>Weitere Anträge:</strong> ${bestDetails.other_applications!.join(", ")}</li>` : ""}
      </ul>`;
    }
    return `
      ${avgSection}
      <h3>3 Immobilienoptionen</h3>
      <ul>${optList}</ul>
      ${bestSection}
      ${recs.length ? `<h3>Empfehlungen</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderStartupConsultingHtml(data: { funding_recommendations?: Array<{ model: string; rationale: string; fit_score?: number }>; incorporation_recommendations?: Array<{ option: string; jurisdiction?: string; rationale: string }>; key_considerations?: string[] }) {
    const funding = data.funding_recommendations ?? [];
    const incorp = data.incorporation_recommendations ?? [];
    const considerations = data.key_considerations ?? [];
    return `
      <h3>Funding Recommendations</h3>
      <ul>${funding.map((f) => `<li><strong>${f.model}</strong>: ${f.rationale}${f.fit_score != null ? ` (fit: ${Math.round(f.fit_score * 100)}%)` : ""}</li>`).join("")}</ul>
      <h3>Incorporation Recommendations</h3>
      <ul>${incorp.map((i) => `<li><strong>${i.option}</strong>${i.jurisdiction ? ` (${i.jurisdiction})` : ""}: ${i.rationale}</li>`).join("")}</ul>
      ${considerations.length ? `<h3>Key Considerations</h3><ul>${considerations.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderCustomerValidationHtml(data: { mvp_scope?: string; hypotheses_tested?: Array<{ hypothesis: string; test_method: string; result: string }>; key_metrics?: { conversion_rate?: string; customer_feedback_summary?: string; early_adopters_count?: string }; recommendation?: string; next_steps?: string[] }) {
    const hypotheses = data.hypotheses_tested ?? [];
    const nextSteps = data.next_steps ?? [];
    const metrics = data.key_metrics;
    return `
      ${data.mvp_scope ? `<h3>MVP-Scope</h3><p>${data.mvp_scope}</p>` : ""}
      <h3>Hypotheses Tested</h3>
      <ul>${hypotheses.map((h) => `<li><strong>${h.hypothesis}</strong> (${h.test_method}): ${h.result}</li>`).join("")}</ul>
      ${metrics ? `<h3>Kennzahlen</h3><p>Conversion Rate: ${metrics.conversion_rate ?? "—"} | Customer Feedback: ${metrics.customer_feedback_summary ?? "—"} | Early Adopters: ${metrics.early_adopters_count ?? "—"}</p>` : ""}
      <h3>Recommendation</h3><p>${data.recommendation ?? "—"}</p>
      ${nextSteps.length ? `<h3>Next Steps</h3><ul>${nextSteps.map((s) => `<li>${s}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderProcessOptimizationHtml(data: { process_analysis?: Array<{ process_name: string; optimization_potential: string }>; recommendations?: string[] }) {
    const processes = data.process_analysis ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Process Analysis</h3>
      <ul>${processes.map((p) => `<li><strong>${p.process_name}</strong>: ${p.optimization_potential}</li>`).join("")}</ul>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderStrategicOptionsHtml(data: { strategic_options?: Array<{ option: string; type: string; description: string }>; recommendations?: string[] }) {
    const options = data.strategic_options ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Strategic Options</h3>
      <ul>${options.map((o) => `<li><strong>${o.option}</strong> (${o.type}): ${o.description}</li>`).join("")}</ul>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderHrPlanningHtml(data: { hiring_plan?: Array<{ role: string; priority: string; timeline?: string }>; recommendations?: string[] }) {
    const plan = data.hiring_plan ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Hiring Plan</h3>
      <ul>${plan.map((p) => `<li><strong>${p.role}</strong> (${p.priority})${p.timeline ? ` — ${p.timeline}` : ""}</li>`).join("")}</ul>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderValuePropositionHtml(data: {
    problem_statement?: string;
    target_customers?: string[];
    existing_solutions?: string[];
    unique_value_proposition?: string;
    key_differentiators?: string[];
    recommendations?: string[];
    sources_used?: string[];
    problem_solution_fit_score?: number;
  }) {
    const customers = data.target_customers ?? [];
    const existing = data.existing_solutions ?? [];
    const diff = data.key_differentiators ?? [];
    const recs = data.recommendations ?? [];
    const sources = data.sources_used ?? [];
    const score =
      typeof data.problem_solution_fit_score === "number"
        ? `<p><strong>Problem-Lösungs-Fit (Problem-Solution Score):</strong> ${data.problem_solution_fit_score}</p>`
        : "";
    const sourcesBlock =
      sources.length > 0
        ? `<h3>Quellen (Sources)</h3><ol>${sources.map((s) => `<li>${s}</li>`).join("")}</ol>`
        : "";
    return `
      ${score}
      <h3>Problemstellung (Problem Statement)</h3><p>${data.problem_statement ?? "—"}</p>
      <h3>Zielkunden (Target Customers)</h3><ul>${customers.map((c) => `<li>${c}</li>`).join("")}</ul>
      ${existing.length ? `<h3>Bestehende Lösungen (Existing Solutions)</h3><ul>${existing.map((e) => `<li>${e}</li>`).join("")}</ul>` : ""}
      <h3>Alleinstellungsmerkmal / Wertversprechen (Unique Value Proposition)</h3><p>${data.unique_value_proposition ?? "—"}</p>
      ${diff.length ? `<h3>Wesentliche Differenzierungsmerkmale (Key Differentiators)</h3><ul>${diff.map((d) => `<li>${d}</li>`).join("")}</ul>` : ""}
      ${recs.length ? `<h3>Empfehlungen (Recommendations)</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
      ${sourcesBlock}
    `;
  },

  renderGoToMarketHtml(data: { pricing_strategy?: { model: string; rationale: string }; sales_channels?: Array<{ channel: string; priority: string }>; recommendations?: string[] }) {
    const pricing = data.pricing_strategy;
    const channels = data.sales_channels ?? [];
    const recs = data.recommendations ?? [];
    return `
      ${pricing ? `<h3>Pricing Strategy</h3><p><strong>${pricing.model}</strong>: ${pricing.rationale}</p>` : ""}
      <h3>Sales Channels</h3><ul>${channels.map((c) => `<li><strong>${c.channel}</strong> (${c.priority})</li>`).join("")}</ul>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderScalingStrategyHtml(data: { scalability_assessment?: string; automation_priorities?: Array<{ area: string; potential: string }>; recommendations?: string[] }) {
    const auto = data.automation_priorities ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Scalability Assessment</h3><p>${data.scalability_assessment ?? "—"}</p>
      ${auto.length ? `<h3>Automation Priorities</h3><ul>${auto.map((a) => `<li><strong>${a.area}</strong>: ${a.potential}</li>`).join("")}</ul>` : ""}
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderMarketingStrategyHtml(data: {
    constraints?: string;
    marketing_initiatives?: Array<{ name?: string; goal?: string; actions?: string; content?: string; hashtags?: string; cta?: string; tracking?: string; expected_conversion?: string; budget_eur?: number | string; effort_h_week?: string; roi?: string }>;
    roadmap_30_days?: Array<{ week?: string; tasks?: string[] }>;
    kpi_goals_30_days?: Array<{ target?: string; metric?: string }>;
    offline_visibility?: string;
    concluding_offer?: string;
    channel_strategy?: Array<{ channel: string; priority?: string; rationale?: string }>;
    target_audiences?: Array<{ segment: string; approach?: string }>;
    budget_allocation?: Array<{ area: string; share?: string; rationale?: string }>;
    campaign_priorities?: string[];
    key_metrics?: Array<{ metric: string; target?: string; current?: string }>;
    recommendations?: string[];
  }) {
    const initiatives = data.marketing_initiatives ?? [];
    const roadmap = data.roadmap_30_days ?? [];
    const kpiGoals = data.kpi_goals_30_days ?? [];
    const channels = data.channel_strategy ?? [];
    const audiences = data.target_audiences ?? [];
    const budget = data.budget_allocation ?? [];
    const campaigns = data.campaign_priorities ?? [];
    const metrics = data.key_metrics ?? [];
    const recs = data.recommendations ?? [];
    const hasNew = initiatives.length > 0 || roadmap.length > 0 || kpiGoals.length > 0;
    return `
      ${data.constraints ? `<p><strong>Priorisierung:</strong> ${data.constraints}</p>` : ""}
      ${initiatives.length ? `<h3>Marketing-Maßnahmen</h3><ul>${initiatives.map((i) => `<li><strong>${i.name ?? "—"}</strong>: ${i.goal ?? ""}${i.expected_conversion ? ` (${i.expected_conversion})` : ""}</li>`).join("")}</ul>` : ""}
      ${roadmap.length ? `<h3>30-Tage-Roadmap</h3><ul>${roadmap.map((w) => `<li><strong>${w.week}</strong>: ${(w.tasks ?? []).join("; ")}</li>`).join("")}</ul>` : ""}
      ${kpiGoals.length ? `<h3>KPI-Ziele nach 30 Tagen</h3><ul>${kpiGoals.map((k) => `<li>${k.target ?? ""}</li>`).join("")}</ul>` : ""}
      ${data.offline_visibility ? `<h3>Offline-Sichtbarkeit</h3><p>${data.offline_visibility}</p>` : ""}
      ${data.concluding_offer ? `<p>${data.concluding_offer}</p>` : ""}
      ${!hasNew && channels.length ? `<h3>Kanalstrategie</h3><ul>${channels.map((c) => `<li><strong>${c.channel}</strong>${c.priority ? ` (${c.priority})` : ""}${c.rationale ? `: ${c.rationale}` : ""}</li>`).join("")}</ul>` : ""}
      ${!hasNew && audiences.length ? `<h3>Zielgruppen</h3><ul>${audiences.map((a) => `<li><strong>${a.segment}</strong>${a.approach ? `: ${a.approach}` : ""}</li>`).join("")}</ul>` : ""}
      ${!hasNew && budget.length ? `<h3>Budgetverteilung</h3><ul>${budget.map((b) => `<li><strong>${b.area}</strong>${b.share ? ` (${b.share})` : ""}${b.rationale ? `: ${b.rationale}` : ""}</li>`).join("")}</ul>` : ""}
      ${!hasNew && campaigns.length ? `<h3>Kampagnenprioritäten</h3><ul>${campaigns.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}
      ${!hasNew && metrics.length ? `<h3>Kernkennzahlen</h3><ul>${metrics.map((m) => `<li><strong>${m.metric}</strong>${m.target ? ` Ziel: ${m.target}` : ""}${m.current ? ` aktuell: ${m.current}` : ""}</li>`).join("")}</ul>` : ""}
      ${recs.length ? `<h3>Empfehlungen</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderPortfolioManagementHtml(data: { portfolio_analysis?: Array<{ product_or_segment: string; performance: string; recommendation: string }>; recommendations?: string[] }) {
    const portfolio = data.portfolio_analysis ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Portfolio Analysis</h3>
      <ul>${portfolio.map((p) => `<li><strong>${p.product_or_segment}</strong>: ${p.performance} — ${p.recommendation}</li>`).join("")}</ul>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderScenarioAnalysisHtml(data: { scenarios?: Array<{ name: string; description: string }>; risk_matrix?: Array<{ risk: string; likelihood: string; impact: string; mitigation?: string }>; recommendations?: string[] }) {
    const scenarios = data.scenarios ?? [];
    const risks = data.risk_matrix ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Scenarios</h3><ul>${scenarios.map((s) => `<li><strong>${s.name}</strong>: ${s.description}</li>`).join("")}</ul>
      ${risks.length ? `<h3>Risk Matrix</h3><ul>${risks.map((r) => `<li><strong>${r.risk}</strong> (${r.likelihood}/${r.impact})${r.mitigation ? ` — ${r.mitigation}` : ""}</li>`).join("")}</ul>` : ""}
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderOperativePlanHtml(data: { annual_plan_summary?: string; key_milestones?: Array<{ milestone: string; timeline: string }>; recommendations?: string[] }) {
    const milestones = data.key_milestones ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Annual Plan Summary</h3><p>${data.annual_plan_summary ?? "—"}</p>
      ${milestones.length ? `<h3>Key Milestones</h3><ul>${milestones.map((m) => `<li><strong>${m.milestone}</strong> — ${m.timeline}</li>`).join("")}</ul>` : ""}
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderCompetitorAnalysisHtml(data: { competitors?: Array<{ name: string; strengths?: string[]; weaknesses?: string[]; market_position?: string }>; competitive_landscape?: string; differentiation_opportunities?: string[]; recommendations?: string[] }) {
    const comps = data.competitors ?? [];
    const diff = data.differentiation_opportunities ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Wettbewerber</h3>
      <ul>${comps.map((c) => `<li><strong>${c.name}</strong>${c.market_position ? ` (${c.market_position})` : ""}${c.strengths?.length ? ` — Stärken: ${c.strengths.join(", ")}` : ""}${c.weaknesses?.length ? ` — Schwächen: ${c.weaknesses.join(", ")}` : ""}</li>`).join("")}</ul>
      ${data.competitive_landscape ? `<h3>Wettbewerbslandschaft</h3><p>${data.competitive_landscape}</p>` : ""}
      ${diff.length ? `<h3>Differenzierungsmöglichkeiten</h3><ul>${diff.map((d) => `<li>${d}</li>`).join("")}</ul>` : ""}
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderSwotAnalysisHtml(data: { strengths?: string[]; weaknesses?: string[]; opportunities?: string[]; threats?: string[]; recommendations?: string[] }) {
    const s = data.strengths ?? [];
    const w = data.weaknesses ?? [];
    const o = data.opportunities ?? [];
    const t = data.threats ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Stärken</h3><ul>${s.map((x) => `<li>${x}</li>`).join("")}</ul>
      <h3>Schwächen</h3><ul>${w.map((x) => `<li>${x}</li>`).join("")}</ul>
      <h3>Chancen</h3><ul>${o.map((x) => `<li>${x}</li>`).join("")}</ul>
      <h3>Bedrohungen</h3><ul>${t.map((x) => `<li>${x}</li>`).join("")}</ul>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderFinancialPlanningHtml(data: { liquidity_plan?: { summary: string }; profitability_plan?: { summary: string }; capital_requirements?: { total_required?: string }; break_even_analysis?: { break_even_point: string }; recommendations?: string[] }) {
    const liq = data.liquidity_plan?.summary ?? "—";
    const prof = data.profitability_plan?.summary ?? "—";
    const cap = data.capital_requirements?.total_required ?? "—";
    const be = data.break_even_analysis?.break_even_point ?? "—";
    const recs = data.recommendations ?? [];
    return `
      <h3>Liquiditätsplan</h3><p>${liq}</p>
      <h3>Rentabilitätsplan</h3><p>${prof}</p>
      <h3>Kapitalbedarf</h3><p>${cap}</p>
      <h3>Break-Even</h3><p>${be}</p>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderStrategicPlanningHtml(data: { market_position?: { current_assessment: string }; competitive_advantages?: Array<{ advantage: string }>; recommendations?: string[] }) {
    const pos = data.market_position?.current_assessment ?? "—";
    const adv = data.competitive_advantages ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Marktposition</h3><p>${pos}</p>
      <h3>Wettbewerbsvorteile</h3><ul>${adv.map((a) => `<li>${a.advantage}</li>`).join("")}</ul>
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  renderTrendAnalysisHtml(data: { macro_trends?: Array<{ trend: string; impact: string }>; industry_trends?: string[]; implications_for_business?: string[]; recommendations?: string[] }) {
    const macro = data.macro_trends ?? [];
    const ind = data.industry_trends ?? [];
    const impl = data.implications_for_business ?? [];
    const recs = data.recommendations ?? [];
    return `
      <h3>Makrotrends</h3><ul>${macro.map((m) => `<li><strong>${m.trend}</strong>: ${m.impact}</li>`).join("")}</ul>
      <h3>Branchentrends</h3><ul>${ind.map((i) => `<li>${i}</li>`).join("")}</ul>
      ${impl.length ? `<h3>Implikationen</h3><ul>${impl.map((i) => `<li>${i}</li>`).join("")}</ul>` : ""}
      ${recs.length ? `<h3>Recommendations</h3><ul>${recs.map((r) => `<li>${r}</li>`).join("")}</ul>` : ""}
    `;
  },

  async verifyStep(stepId: string, notes?: string) {
    return prisma.runStep.update({
      where: { id: stepId },
      data: { verifiedByUser: true, verificationNotes: notes ?? null },
    });
  },

  async deleteStep(stepId: string) {
    return prisma.runStep.delete({ where: { id: stepId } });
  },

  async deleteRun(runId: string) {
    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run) return null;

    await prisma.$transaction(async (tx) => {
      const decisions = await tx.decision.findMany({ where: { runId } });
      const decisionIds = decisions.map((d) => d.id);
      const experiments = await tx.experiment.findMany({ where: { decisionId: { in: decisionIds } } });
      const experimentIds = experiments.map((e) => e.id);

      await tx.learningEvent.deleteMany({ where: { decisionId: { in: decisionIds } } });
      await tx.learningEvent.deleteMany({ where: { experimentId: { in: experimentIds } } });
      await tx.decisionUpdate.deleteMany({ where: { decisionId: { in: decisionIds } } });
      await tx.experiment.deleteMany({ where: { decisionId: { in: decisionIds } } });
      await tx.decision.deleteMany({ where: { runId } });
      await tx.artifact.deleteMany({ where: { runId } });
      await tx.runStep.deleteMany({ where: { runId } });
      await tx.run.delete({ where: { id: runId } });
    });
    return run;
  },

  /** Create artifacts from valid steps when they were saved before artifact logic existed */
  async createMissingArtifactsForRun(runId: string): Promise<{ created: string[] }> {
    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: { steps: true, artifacts: true },
    });
    if (!run) return { created: [] };

    const wfBaselineSteps: Array<{ stepKey: string; schemaKey: SchemaKey; type: "baseline" | "industry_research" }> = [
      { stepKey: "kpi_gap_scan", schemaKey: "kpi_gap_report", type: "baseline" },
      { stepKey: "industry_research", schemaKey: "industry_research", type: "industry_research" },
    ];

    const artifactStepMap: Record<string, { stepKey: string; schemaKey: SchemaKey; type: string }> = {
      WF_MARKET: { stepKey: "market_snapshot", schemaKey: "market_snapshot", type: "market" },
      WF_DIAGNOSTIC: { stepKey: "root_cause_trees", schemaKey: "root_cause_trees", type: "diagnostic" },
      WF_NEXT_BEST_ACTIONS: { stepKey: "decision_engine", schemaKey: "decision_pack", type: "decision_pack" },
      WF_KPI_ESTIMATION: { stepKey: "kpi_estimation", schemaKey: "kpi_estimation", type: "kpi_estimation" },
      WF_DATA_COLLECTION_PLAN: { stepKey: "kpi_computation_plan", schemaKey: "kpi_questions", type: "data_collection_plan" },
      WF_MENU_CARD: { stepKey: "menu_card", schemaKey: "menu_card", type: "menu_card" },
      WF_SUPPLIER_LIST: { stepKey: "supplier_list", schemaKey: "supplier_list", type: "supplier_list" },
      WF_MENU_COST: { stepKey: "menu_cost", schemaKey: "menu_cost", type: "menu_cost" },
      WF_MENU_PRICING: { stepKey: "menu_preiskalkulation", schemaKey: "menu_preiskalkulation", type: "menu_preiskalkulation" },
      WF_REAL_ESTATE: { stepKey: "real_estate", schemaKey: "real_estate", type: "real_estate" },
      WF_STARTUP_CONSULTING: { stepKey: "startup_consulting", schemaKey: "startup_consulting", type: "startup_guide" },
      WF_IDEA_USP_VALIDATION: { stepKey: "value_proposition", schemaKey: "value_proposition", type: "value_proposition" },
      WF_FEASIBILITY_VALIDATION: { stepKey: "scenario_analysis", schemaKey: "scenario_analysis", type: "scenario_analysis" },
      WF_PATENT_CHECK: { stepKey: "strategic_options", schemaKey: "strategic_options", type: "strategic_options" },
      WF_LEGAL_FOUNDATION: { stepKey: "startup_consulting", schemaKey: "startup_consulting", type: "startup_guide" },
      WF_CUSTOMER_VALIDATION: { stepKey: "customer_validation", schemaKey: "customer_validation", type: "customer_validation" },
      WF_PROCESS_OPTIMIZATION: { stepKey: "process_optimization", schemaKey: "process_optimization", type: "process_optimization" },
      WF_STRATEGIC_OPTIONS: { stepKey: "strategic_options", schemaKey: "strategic_options", type: "strategic_options" },
      WF_VALUE_PROPOSITION: { stepKey: "value_proposition", schemaKey: "value_proposition", type: "value_proposition" },
      WF_GO_TO_MARKET: { stepKey: "go_to_market", schemaKey: "go_to_market", type: "go_to_market" },
      WF_SCALING_STRATEGY: { stepKey: "scaling_strategy", schemaKey: "scaling_strategy", type: "scaling_strategy" },
      WF_PORTFOLIO_MANAGEMENT: { stepKey: "portfolio_management", schemaKey: "portfolio_management", type: "portfolio_management" },
      WF_SCENARIO_ANALYSIS: { stepKey: "scenario_analysis", schemaKey: "scenario_analysis", type: "scenario_analysis" },
      WF_OPERATIVE_PLAN: { stepKey: "operative_plan", schemaKey: "operative_plan", type: "operative_plan" },
      WF_SWOT: { stepKey: "swot_analysis", schemaKey: "swot_analysis", type: "swot_analysis" },
      WF_COMPETITOR_ANALYSIS: { stepKey: "competitor_analysis", schemaKey: "competitor_analysis", type: "competitor_analysis" },
      WF_FINANCIAL_PLANNING: { stepKey: "financial_planning", schemaKey: "financial_planning", type: "financial_planning" },
      WF_STRATEGIC_PLANNING: { stepKey: "strategic_planning", schemaKey: "strategic_planning", type: "strategic_planning" },
      WF_TREND_ANALYSIS: { stepKey: "trend_analysis", schemaKey: "trend_analysis", type: "trend_analysis" },
    };

    const wfResearchSteps: Array<{ stepKey: string; type: "market_research" | "best_practices" | "failure_analysis" }> = [
      { stepKey: "market_research", type: "market_research" },
      { stepKey: "best_practices", type: "best_practices" },
      { stepKey: "failure_reasons", type: "failure_analysis" },
    ];

    const wfFinancialSteps: Array<{ stepKey: string; type: "work_processes" | "personnel_plan" | "financial_planning" }> = [
      { stepKey: "work_processes", type: "work_processes" },
      { stepKey: "personnel_plan", type: "personnel_plan" },
      { stepKey: "financial_planning", type: "financial_planning" },
    ];

    const created: string[] = [];

    if (run.workflowKey === "WF_FINANCIAL_PLANNING") {
      for (const { stepKey, type } of wfFinancialSteps) {
        const hasArtifact = run.artifacts.some((a) => a.type === type);
        if (hasArtifact) continue;
        const step = run.steps.find((s) => s.stepKey === stepKey);
        if (type !== "financial_planning" && (!step?.schemaValidationPassed || !step?.parsedOutputJson)) continue;
        const data = step?.parsedOutputJson as Record<string, unknown> | undefined;
        if (type === "work_processes") {
          const parsed = workProcessesSchema.safeParse(data);
          if (parsed.success) {
            await createWorkProcessesArtifact({
              companyId: run.companyId,
              runId: run.id,
              title: "Arbeitsprozesse (Planung → Einkauf → Endkunde)",
              contentJson: toPrismaJson(parsed.data),
              exportHtml: this.renderWorkProcessesHtml(parsed.data),
            });
            created.push("work_processes");
          }
        } else if (type === "personnel_plan") {
          const parsed = personnelPlanSchema.safeParse(data);
          if (parsed.success) {
            const artifactData = {
              companyId: run.companyId,
              runId: run.id,
              type: "personnel_plan" as const,
              title: "Personalplan Jahr 1",
              version: 1,
              contentJson: parsed.data as object,
            };
            try {
              await prisma.artifact.create({ data: artifactData });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              throw new Error(`Artifact create failed (personnel_plan): ${msg}`);
            }
            created.push("personnel_plan");
          }
        } else if (type === "financial_planning") {
          const step = run.steps.find((s) => s.stepKey === "financial_planning");
          if (step?.schemaValidationPassed && step.parsedOutputJson) {
            const parsed = financialPlanningSchema.safeParse(step.parsedOutputJson);
            if (parsed.success) {
              let content = parsed.data;
              const realEstateArtifact = await prisma.artifact.findFirst({
                where: { companyId: run.companyId, type: "real_estate" },
                orderBy: { createdAt: "desc" },
              });
              const realEstate = realEstateArtifact?.contentJson as Record<string, unknown> | null;
              const miete = parseMieteFromRealEstate(realEstate);
              if (miete != null) content = applyMieteFromRealEstate(content, miete);
              const personnelPlanArtifact = await prisma.artifact.findFirst({
                where: { companyId: run.companyId, type: "personnel_plan" },
                orderBy: { createdAt: "desc" },
              });
              const personnelPlan = personnelPlanArtifact?.contentJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null;
              const personnelStep = (run as { steps?: Array<{ stepKey: string; parsedOutputJson: unknown }> }).steps?.find((s: { stepKey: string }) => s.stepKey === "personnel_plan");
              const personnelData = (personnelStep?.parsedOutputJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null) ?? personnelPlan;
              if (personnelData?.monthly_personnel_costs?.length) {
                content = applyPersonnelFromPersonnelPlan(content, personnelData.monthly_personnel_costs);
              }
              await prisma.artifact.create({
                data: {
                  companyId: run.companyId,
                  runId: run.id,
                  type: "financial_planning",
                  title: "Finanzplanung",
                  version: 1,
                  contentJson: content as object,
                  exportHtml: this.renderFinancialPlanningHtml(content),
                },
              });
              created.push("financial_planning");
            }
          } else {
            const merged = await this.tryMergeFinancialPlanningSteps(run);
            if (merged) {
              let content = merged;
              const realEstateArtifact = await prisma.artifact.findFirst({
                where: { companyId: run.companyId, type: "real_estate" },
                orderBy: { createdAt: "desc" },
              });
              const realEstate = realEstateArtifact?.contentJson as Record<string, unknown> | null;
              const miete = parseMieteFromRealEstate(realEstate);
              if (miete != null) content = applyMieteFromRealEstate(content, miete);
              const personnelPlanArtifact = await prisma.artifact.findFirst({
                where: { companyId: run.companyId, type: "personnel_plan" },
                orderBy: { createdAt: "desc" },
              });
              const personnelPlan = personnelPlanArtifact?.contentJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null;
              const personnelStep = (run as { steps?: Array<{ stepKey: string; parsedOutputJson: unknown }> }).steps?.find((s: { stepKey: string }) => s.stepKey === "personnel_plan");
              const personnelData = (personnelStep?.parsedOutputJson as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null) ?? personnelPlan;
              if (personnelData?.monthly_personnel_costs?.length) {
                content = applyPersonnelFromPersonnelPlan(content, personnelData.monthly_personnel_costs);
              }
              await prisma.artifact.create({
                data: {
                  companyId: run.companyId,
                  runId: run.id,
                  type: "financial_planning",
                  title: "Finanzplanung",
                  version: 1,
                  contentJson: content as object,
                  exportHtml: this.renderFinancialPlanningHtml(content),
                },
              });
              created.push("financial_planning");
            }
          }
        }
      }
      if (created.length > 0) await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      return { created };
    }

    if (run.workflowKey === "WF_RESEARCH") {
      for (const { stepKey, type } of wfResearchSteps) {
        const hasArtifact = run.artifacts.some((a) => a.type === type);
        if (hasArtifact) continue;
        const step = run.steps.find((s) => s.stepKey === stepKey);
        if (!step?.schemaValidationPassed || !step.parsedOutputJson) continue;
        const data = step.parsedOutputJson as Record<string, unknown>;
        if (type === "market_research") {
          const parsed = marketResearchSchema.safeParse(data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "market_research",
                title: "Market Research",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderMarketResearchHtml(parsed.data),
              },
            });
            created.push("market_research");
          }
        } else if (type === "best_practices") {
          const parsed = bestPracticesSchema.safeParse(data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "best_practices",
                title: "Best Practices",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderBestPracticesHtml(parsed.data),
              },
            });
            created.push("best_practices");
          }
        } else if (type === "failure_analysis") {
          const parsed = failureReasonsSchema.safeParse(data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "failure_analysis",
                title: "Why Businesses Fail",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderFailureReasonsHtml(parsed.data),
              },
            });
            created.push("failure_analysis");
          }
        }
      }
      if (created.length > 0) await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      return { created };
    }

    if (run.workflowKey === "WF_BASELINE") {
      for (const { stepKey, schemaKey, type } of wfBaselineSteps) {
        const hasArtifact = run.artifacts.some((a) => a.type === type);
        if (hasArtifact) continue;
        const step = run.steps.find((s) => s.stepKey === stepKey);
        if (!step?.schemaValidationPassed || !step.parsedOutputJson) continue;
        const data = step.parsedOutputJson as Record<string, unknown>;
        if (type === "baseline") {
          const parsed = kpiGapReportSchema.safeParse(data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: $Enums.ArtifactType.baseline,
                title: "Baseline KPI Gap Report",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderBaselineHtml(parsed.data),
              },
            });
            created.push("baseline");
          }
        } else if (type === "industry_research") {
          const parsed = industryResearchSchema.safeParse(data);
          if (parsed.success) {
            await prisma.artifact.create({
              data: {
                companyId: run.companyId,
                runId: run.id,
                type: "industry_research",
                title: "Industry & Location Data",
                version: 1,
                contentJson: parsed.data as object,
                exportHtml: this.renderIndustryResearchHtml(parsed.data),
              },
            });
            created.push("industry_research");
          }
        }
      }
      if (created.length > 0) await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      return { created };
    }

    if (run.workflowKey === "WF_BUSINESS_PLAN") {
      const hasArtifact = run.artifacts.some((a) => a.type === "business_plan");
      if (hasArtifact) return { created: [] };
      const execStep = run.steps.find((s) => s.stepKey === "business_plan_executive");
      const marketStep = run.steps.find((s) => s.stepKey === "business_plan_market");
      const marketingStep = run.steps.find((s) => s.stepKey === "business_plan_marketing");
      const financialStep = run.steps.find((s) => s.stepKey === "business_plan_financial");
      const riskStep = run.steps.find((s) => s.stepKey === "business_plan_risk");
      const exec = execStep?.schemaValidationPassed && execStep.parsedOutputJson
        ? businessPlanSectionSchema.safeParse(execStep.parsedOutputJson)
        : { success: false as const };
      const market = marketStep?.schemaValidationPassed && marketStep.parsedOutputJson
        ? businessPlanSectionSchema.safeParse(marketStep.parsedOutputJson)
        : { success: false as const };
      const financial = financialStep?.schemaValidationPassed && financialStep.parsedOutputJson
        ? businessPlanSchema.safeParse(financialStep.parsedOutputJson)
        : { success: false as const };
      const marketing = marketingStep?.schemaValidationPassed && marketingStep.parsedOutputJson
        ? businessPlanSectionSchema.safeParse(marketingStep.parsedOutputJson)
        : { success: false as const };
      const risk = riskStep?.schemaValidationPassed && riskStep.parsedOutputJson
        ? businessPlanSectionSchema.safeParse(riskStep.parsedOutputJson)
        : { success: false as const };
      if (exec.success && market.success && marketing.success && financial.success && risk.success) {
        const fpArtifact = await prisma.artifact.findFirst({
          where: { companyId: run.companyId, type: "financial_planning" },
          orderBy: { createdAt: "desc" },
        });
        const fpContent = fpArtifact?.contentJson as { monthly_projection?: unknown[] } | null;
        const monthlyProj = (fpContent?.monthly_projection?.length ? fpContent.monthly_projection : financial.data.monthly_projection) ?? financial.data.monthly_projection;
        const merged = {
          executive_summary: exec.data,
          market_analysis: market.data,
          marketing_plan: marketing.data,
          financial_scenarios: financial.data,
          management_team: financial.data.management_team,
          legal_structure: financial.data.legal_structure,
          capital_requirements_summary: financial.data.capital_requirements_summary,
          monthly_projection: monthlyProj,
          risk_analysis: risk.data,
        };
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "business_plan",
            title: "Business Plan",
            version: 1,
            contentJson: merged as object,
            exportHtml: this.renderBusinessPlanMultiSectionHtml(merged as { executive_summary?: { content: string; key_points?: string[] }; market_analysis?: { content: string; key_points?: string[] }; marketing_plan?: { content: string; key_points?: string[] }; monthly_projection?: { month: string; revenue?: number; total_costs?: number; net?: number }[]; [key: string]: unknown }),
          },
        });
        created.push("business_plan");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
      return { created };
    }

    const config = artifactStepMap[run.workflowKey];
    if (!config) return { created: [] };

    if (run.artifacts.length > 0) return { created: [] };

    const step = run.steps.find((s) => s.stepKey === config.stepKey);
    if (!step?.schemaValidationPassed || !step.parsedOutputJson) return { created: [] };

    const data = step.parsedOutputJson as Record<string, unknown>;

    if (config.type === "baseline") {
      const parsed = kpiGapReportSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "baseline",
            title: "Baseline KPI Gap Report",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderBaselineHtml(parsed.data),
          },
        });
        created.push("baseline");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "market") {
      const parsed = marketSnapshotSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "market",
            title: "Market Snapshot",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderMarketHtml(parsed.data),
          },
        });
        created.push("market");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "diagnostic") {
      const parsed = rootCauseTreesSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "diagnostic",
            title: "Root Cause Trees",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderDiagnosticHtml(parsed.data),
          },
        });
        created.push("diagnostic");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "decision_pack") {
      const parsed = decisionPackSchema.safeParse(data);
      if (parsed.success) {
        await this.createDecisionsFromPack(run.companyId, run.id, parsed.data);
        created.push("decision_pack");
      }
    } else if (config.type === "data_collection_plan") {
      const parsed = kpiQuestionsSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "data_collection_plan",
            title: "KPI Computation Plan",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderDataCollectionPlanHtml(parsed.data),
          },
        });
        created.push("data_collection_plan");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "kpi_estimation") {
      const parsed = kpiEstimationSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "kpi_estimation",
            title: "KPI Estimation",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderKpiEstimationHtml(parsed.data),
          },
        });
        created.push("kpi_estimation");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "work_processes") {
      const parsed = workProcessesSchema.safeParse(data);
      if (parsed.success) {
        await createWorkProcessesArtifact({
          companyId: run.companyId,
          runId: run.id,
          title: "Arbeitsprozesse (Planung → Einkauf → Endkunde)",
          contentJson: toPrismaJson(parsed.data),
          exportHtml: this.renderWorkProcessesHtml(parsed.data),
        });
        created.push("work_processes");
      }
    } else if (config.type === "menu_card") {
      const parsed = menuCardSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: $Enums.ArtifactType.menu_card,
            title: "Menu Card",
            version: 1,
            contentJson: toPrismaJson(parsed.data),
            exportHtml: this.renderMenuCardHtml(parsed.data),
          },
        });
        created.push("menu_card");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "supplier_list") {
      const parsed = supplierListSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "supplier_list",
            title: "Supplier List",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderSupplierListHtml(parsed.data),
          },
        });
        created.push("supplier_list");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "menu_cost") {
      const parsed = menuCostSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: $Enums.ArtifactType.menu_cost,
            title: "Warenkosten",
            version: 1,
            contentJson: toPrismaJson(parsed.data),
            exportHtml: this.renderMenuCostHtml(parsed.data),
          },
        });
        created.push("menu_cost");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "menu_preiskalkulation") {
      const parsed = menuPreiskalkulationSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: $Enums.ArtifactType.menu_preiskalkulation,
            title: "Preiskalkulation",
            version: 1,
            contentJson: toPrismaJson(parsed.data),
            exportHtml: this.renderMenuPreiskalkulationHtml(parsed.data),
          },
        });
        created.push("menu_preiskalkulation");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "real_estate") {
      const parsed = realEstateSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "real_estate",
            title: "Real Estate Options",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderRealEstateHtml(parsed.data),
          },
        });
        created.push("real_estate");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "startup_guide") {
      const parsed = startupConsultingSchema.safeParse(data);
      if (parsed.success) {
        const isLegalFoundation = run.workflowKey === "WF_LEGAL_FOUNDATION";
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "startup_guide",
            title: isLegalFoundation ? "Rechtliche Vorgaben & Unternehmensform" : "Funding",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderStartupConsultingHtml(parsed.data),
          },
        });
        created.push("startup_guide");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "customer_validation") {
      const parsed = customerValidationSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "customer_validation",
            title: "Customer Validation",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderCustomerValidationHtml(parsed.data),
          },
        });
        created.push("customer_validation");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "process_optimization") {
      const parsed = processOptimizationSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "process_optimization",
            title: "Process Optimization",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderProcessOptimizationHtml(parsed.data),
          },
        });
        created.push("process_optimization");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "strategic_options") {
      const parsed = strategicOptionsSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "strategic_options",
            title: "Strategic Options",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderStrategicOptionsHtml(parsed.data),
          },
        });
        created.push("strategic_options");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "hr_planning") {
      const parsed = hrPlanningSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "hr_planning",
            title: "HR Planning",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderHrPlanningHtml(parsed.data),
          },
        });
        created.push("hr_planning");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "value_proposition") {
      const parsed = valuePropositionSchema.safeParse(data);
      if (parsed.success) {
        const isIdeaUspValidation = run.workflowKey === "WF_IDEA_USP_VALIDATION";
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: $Enums.ArtifactType.value_proposition,
            title: isIdeaUspValidation ? "Idee- & USP-Validierung" : "Value Proposition & Problem-Solution-Fit",
            version: 1,
            contentJson: toPrismaJson(parsed.data),
            exportHtml: this.renderValuePropositionHtml(parsed.data),
          },
        });
        created.push("value_proposition");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "go_to_market") {
      const parsed = goToMarketSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "go_to_market",
            title: "Go-to-Market & Pricing",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderGoToMarketHtml(parsed.data),
          },
        });
        created.push("go_to_market");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "marketing_strategy") {
      const parsed = marketingStrategySchema.safeParse(data);
      if (parsed.success) {
        await createArtifactWithEnumFallback({
          companyId: run.companyId,
          runId: run.id,
          type: "marketing_strategy",
          title: "Marketing Strategie",
          contentJson: parsed.data as object,
          exportHtml: this.renderMarketingStrategyHtml(parsed.data),
        });
        created.push("marketing_strategy");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "scaling_strategy") {
      const parsed = scalingStrategySchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "scaling_strategy",
            title: "Scaling Strategy",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderScalingStrategyHtml(parsed.data),
          },
        });
        created.push("scaling_strategy");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "portfolio_management") {
      const parsed = portfolioManagementSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "portfolio_management",
            title: "Portfolio & Brand Strategy",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderPortfolioManagementHtml(parsed.data),
          },
        });
        created.push("portfolio_management");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "scenario_analysis") {
      const parsed = scenarioAnalysisSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "scenario_analysis",
            title: "Scenario & Risk Analysis",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderScenarioAnalysisHtml(parsed.data),
          },
        });
        created.push("scenario_analysis");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "operative_plan") {
      const parsed = operativePlanSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "operative_plan",
            title: "Operative Plan",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderOperativePlanHtml(parsed.data),
          },
        });
        created.push("operative_plan");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "competitor_analysis") {
      const parsed = competitorAnalysisSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "competitor_analysis",
            title: "Wettbewerbsanalyse",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderCompetitorAnalysisHtml(parsed.data),
          },
        });
        created.push("competitor_analysis");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "swot_analysis") {
      const parsed = swotAnalysisSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "swot_analysis",
            title: "SWOT-Analyse",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderSwotAnalysisHtml(parsed.data),
          },
        });
        created.push("swot_analysis");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "financial_planning") {
      const parsed = financialPlanningSchema.safeParse(data);
      if (parsed.success) {
        let content = parsed.data;
        const realEstateArtifact = await prisma.artifact.findFirst({
          where: { companyId: run.companyId, type: "real_estate" },
          orderBy: { createdAt: "desc" },
        });
        const realEstate = realEstateArtifact?.contentJson as Record<string, unknown> | null;
        const miete = parseMieteFromRealEstate(realEstate);
        if (miete != null) {
          content = applyMieteFromRealEstate(content, miete);
        }
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "financial_planning",
            title: "Finanzplanung",
            version: 1,
            contentJson: content as object,
            exportHtml: this.renderFinancialPlanningHtml(content),
          },
        });
        created.push("financial_planning");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "strategic_planning") {
      const parsed = strategicPlanningSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "strategic_planning",
            title: "Strategische Planung",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderStrategicPlanningHtml(parsed.data),
          },
        });
        created.push("strategic_planning");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    } else if (config.type === "trend_analysis") {
      const parsed = trendAnalysisSchema.safeParse(data);
      if (parsed.success) {
        await prisma.artifact.create({
          data: {
            companyId: run.companyId,
            runId: run.id,
            type: "trend_analysis",
            title: "Trendanalyse",
            version: 1,
            contentJson: parsed.data as object,
            exportHtml: this.renderTrendAnalysisHtml(parsed.data),
          },
        });
        created.push("trend_analysis");
        await prisma.run.update({ where: { id: runId }, data: { status: "complete" } });
      }
    }

    return { created };
  },
};
