import { PrismaClient } from "@prisma/client";
import { promptTemplates } from "../src/prompts/registry";
import { KPI_INPUT_FIELDS, buildKpiLibraryRows } from "./data/kpiLibrary";
import { STRATEGY_INDICATORS, INDICATOR_MAPPING_RULES } from "./data/strategyIndicators";

/**
 * Seed nutzt optional DIRECT_URL (direkte Postgres-Verbindung, z. B. Supabase Port 5432),
 * damit der Supabase Session-Pooler nicht mit "MaxClientsInSessionMode" blockiert.
 * In .env: DIRECT_URL=postgresql://...db.xxx.supabase.co:5432/... (aus Dashboard → Connection string → Direct)
 */
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  // Legacy-Nutzer (ohne Verifizierungs-Flow): als bestätigt markieren — neue Registrierungen haben immer einen Code-Hash
  await prisma.user.updateMany({
    where: { emailVerified: false, emailVerificationCodeHash: null },
    data: { emailVerified: true },
  });

  for (const f of KPI_INPUT_FIELDS) {
    await prisma.kpiInputField.upsert({
      where: { key: f.key },
      update: { labelSimple: f.labelSimple, unit: f.unit, description: f.description },
      create: { key: f.key, labelSimple: f.labelSimple, unit: f.unit, description: f.description },
    });
  }

  const kpiRows = buildKpiLibraryRows();
  for (const kpi of kpiRows) {
    await prisma.kpiLibrary.upsert({
      where: { kpiKey: kpi.kpiKey },
      update: {
        businessModelType: kpi.businessModelType,
        businessModelsJson: kpi.businessModelsJson as object,
        domain: kpi.domain,
        nameSimple: kpi.nameSimple,
        nameAdvanced: kpi.nameAdvanced,
        definition: kpi.definition,
        formulaText: kpi.formulaText,
        proxyFormulaText: kpi.proxyFormulaText,
        unit: kpi.unit,
        requiredInputsJson: kpi.requiredInputsJson as object,
        priorityWeight: kpi.priorityWeight,
        decisionWeight: kpi.decisionWeight,
        defaultTargetsJson: kpi.defaultTargetsJson as object,
        defaultTargetsByStageJson: kpi.defaultTargetsByStageJson as object,
        defaultGuardrailsJson: kpi.defaultGuardrailsJson as object,
        leadingOrLagging: kpi.leadingOrLagging,
        whyForDecisions: kpi.whyForDecisions,
      },
      create: {
        businessModelType: kpi.businessModelType,
        businessModelsJson: kpi.businessModelsJson,
        domain: kpi.domain,
        kpiKey: kpi.kpiKey,
        nameSimple: kpi.nameSimple,
        nameAdvanced: kpi.nameAdvanced,
        definition: kpi.definition,
        formulaText: kpi.formulaText,
        proxyFormulaText: kpi.proxyFormulaText,
        unit: kpi.unit,
        requiredInputsJson: kpi.requiredInputsJson,
        priorityWeight: kpi.priorityWeight,
        decisionWeight: kpi.decisionWeight,
        defaultTargetsJson: kpi.defaultTargetsJson,
        defaultTargetsByStageJson: kpi.defaultTargetsByStageJson,
        defaultGuardrailsJson: kpi.defaultGuardrailsJson,
        leadingOrLagging: kpi.leadingOrLagging,
        whyForDecisions: kpi.whyForDecisions,
        version: kpi.version,
      },
    });
  }

  for (const ind of STRATEGY_INDICATORS) {
    await prisma.strategyIndicator.upsert({
      where: { indicatorKey: ind.indicatorKey },
      update: { nameSimple: ind.nameSimple, frameworkOrigin: ind.frameworkOrigin, scale: ind.scale, definition: ind.definition, scoringRubricJson: ind.scoringRubricJson as object, outputsJson: ind.outputsJson as object, whyForDecisions: ind.whyForDecisions ?? undefined },
      create: { indicatorKey: ind.indicatorKey, nameSimple: ind.nameSimple, frameworkOrigin: ind.frameworkOrigin, scale: ind.scale, definition: ind.definition, scoringRubricJson: ind.scoringRubricJson as object, outputsJson: ind.outputsJson as object, whyForDecisions: ind.whyForDecisions ?? null },
    });
  }

  for (const rule of INDICATOR_MAPPING_RULES) {
    await prisma.indicatorMappingRule.upsert({
      where: { ruleKey: rule.ruleKey },
      update: { conditionExpression: rule.conditionExpression, actionsJson: rule.actionsJson as object },
      create: { ruleKey: rule.ruleKey, conditionExpression: rule.conditionExpression, actionsJson: rule.actionsJson as object },
    });
  }

  const workflowKeys = [...new Set([...promptTemplates.map((p) => p.workflowKey), "WF_BUSINESS_FORM"])];
  const workflowNames: Record<string, string> = {
    WF_BUSINESS_FORM: "Business Form",
    WF_BASELINE: "Baseline",
    WF_MARKET: "Market Snapshot",
    WF_RESEARCH: "Market & Best Practices Research",
    WF_MENU_CARD: "Menu Card",
    WF_SUPPLIER_LIST: "Supplier List",
    WF_MENU_COST: "Warenkosten",
    WF_MENU_PRICING: "Menü & Preiskalkulation",
    WF_REAL_ESTATE: "Real Estate",
    WF_DIAGNOSTIC: "Diagnostics",
    WF_NEXT_BEST_ACTIONS: "Next Best Actions",
    WF_MARKETING_STRATEGY: "Marketing Strategie",
    WF_BUSINESS_PLAN: "Business Plan & Finance",
    WF_KPI_ESTIMATION: "KPI Estimation",
    WF_DATA_COLLECTION_PLAN: "Data Collection Plan",
    WF_STARTUP_CONSULTING: "Funding",
    WF_CUSTOMER_VALIDATION: "Customer Validation",
    WF_PROCESS_OPTIMIZATION: "Process Optimization",
    WF_STRATEGIC_OPTIONS: "Strategic Options",
    WF_VALUE_PROPOSITION: "Value Proposition",
    WF_GO_TO_MARKET: "Go-to-Market & Pricing",
    WF_SCALING_STRATEGY: "Scaling Strategy",
    WF_GROWTH_MARGIN_OPTIMIZATION: "Margin, Offer & Cost Optimization",
    WF_PORTFOLIO_MANAGEMENT: "Portfolio & Brand Strategy",
    WF_SCENARIO_ANALYSIS: "Scenario & Risk Analysis",
    WF_COMPETITOR_ANALYSIS: "Competitor Analysis",
    WF_SWOT: "SWOT Analysis",
    WF_FINANCIAL_PLANNING: "Finanzplanung",
    WF_STRATEGIC_PLANNING: "Strategic Planning",
    WF_TREND_ANALYSIS: "Trend Analysis",
    WF_OPERATIVE_PLAN: "Operative Plan",
    WF_TECH_DIGITALIZATION: "Technologie & Digitalisierung",
    WF_AUTOMATION_ROI: "Computer-Automatisierung & ROI",
    WF_PHYSICAL_AUTOMATION: "Physische Prozess-Automatisierung",
    WF_INVENTORY_LAUNCH: "Inventar & Equipment (Markteintritt)",
    WF_APP_DEVELOPMENT: "Eigene App – Entwicklung",
  };
  const workflows = workflowKeys.map((key) => ({
    key,
    name: workflowNames[key] ?? key,
    stepsJson: [] as string[],
    gatingRulesJson: {} as object,
  }));
  for (const w of workflows) {
    await prisma.workflow.upsert({
      where: { key: w.key },
      update: { name: w.name, stepsJson: w.stepsJson, gatingRulesJson: w.gatingRulesJson },
      create: w,
    });
  }

  for (const prompt of promptTemplates) {
    await prisma.promptTemplate.upsert({
      where: {
        workflowKey_stepKey_version: {
          workflowKey: prompt.workflowKey,
          stepKey: prompt.stepKey,
          version: prompt.version,
        },
      },
      update: {
        templateText: prompt.templateText,
        outputSchemaKey: prompt.outputSchemaKey,
      },
      create: {
        workflowKey: prompt.workflowKey,
        stepKey: prompt.stepKey,
        version: prompt.version,
        templateText: prompt.templateText,
        outputSchemaKey: prompt.outputSchemaKey,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
