import { prisma } from "@/lib/prisma";
import { renderPrompt } from "@/lib/promptRenderer";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { mergeRunStepsIntoContext, workflowSteps, MANUAL_STEP_KEYS } from "@/lib/workflowSteps";
import { filterContextForStep } from "@/services/contextPack";
import { SchemaKey } from "@/types/schemas";
import { getServerLocale } from "@/lib/locale";
import { fetchChatCompletionWithTemperatureRetry } from "@/lib/llmTemperatureRetry";
import { extractAssistantTextFromChatCompletion } from "@/lib/openAiChatContent";
import {
  fetchLinkedInSearchContext,
  fetchPublicFinanceSearchContext,
  fetchPublicWebsiteText,
  isSafePublicHttpUrl,
  runCompanyEnrichment,
} from "@/lib/companyEnrichment";

async function executeCompanyInternetEnrichmentStep(params: {
  runId: string;
  companyId: string;
  locale: "de" | "en";
}) {
  const hasMeaningfulString = (v: unknown, min = 3): v is string =>
    typeof v === "string" && v.trim().length >= min;

  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { name: true },
  });
  const latestProfile = await prisma.companyProfile.findFirst({
    where: { companyId: params.companyId },
    orderBy: { version: "desc" },
  });
  const latestSession = await prisma.intakeSession.findFirst({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
  });

  const profileObj = (latestProfile?.profileJson as Record<string, unknown>) ?? {};
  const sessionObj = (latestSession?.answersJson as Record<string, unknown>) ?? {};
  const base = { ...sessionObj, ...profileObj };

  const companyName = String(base.company_name ?? company?.name ?? "").trim();
  const website = String(base.website ?? "").trim();
  const location = String(base.location ?? "").trim();

  if (!companyName) {
    throw new Error("Firmenname fehlt für Internet-Recherche.");
  }

  const [websiteText, linkedInCtx, publicFinanceCtx] = await Promise.all([
    website && isSafePublicHttpUrl(website) ? fetchPublicWebsiteText(website) : Promise.resolve(null as string | null),
    fetchLinkedInSearchContext(companyName, location),
    fetchPublicFinanceSearchContext(companyName, location),
  ]);

  const websiteStrong =
    Boolean(websiteText && websiteText.length > 350) &&
    /(impressum|kontakt|über uns|about|speisekarte|menu|preise|price|öffnungszeiten|team|karriere)/i.test(websiteText ?? "");
  const linkedInStrong =
    linkedInCtx.source !== "none" &&
    /linkedin\.com\/company|mitarbeiter|employees|leadership|team/i.test(linkedInCtx.text ?? "");
  const financeStrong =
    publicFinanceCtx.source !== "none" &&
    /northdata|bundesanzeiger|handelsregister|jahresabschluss|umsatz|bilanz/i.test(publicFinanceCtx.text ?? "");
  const strongSignalCount = [websiteStrong, linkedInStrong, financeStrong].filter(Boolean).length;
  const looksExisting = strongSignalCount >= 2;

  let payload: Record<string, unknown>;
  if (!looksExisting) {
    payload = {
      company_exists: false,
      status: "pre_foundation",
      message:
        params.locale === "de"
          ? "Unternehmen befindet sich vermutlich noch vor der Gründung oder ist öffentlich noch nicht ausreichend auffindbar."
          : "Company appears to be pre-foundation or not publicly discoverable yet.",
      company_snapshot: {
        company_name: companyName,
        website,
        location,
      },
      evidence: {
        website_excerpt_found: Boolean(websiteText),
        linkedIn_search_source: linkedInCtx.source,
        public_finance_search_source: publicFinanceCtx.source,
      },
      notes:
        params.locale === "de"
          ? [
              "Keine belastbaren öffentlichen Treffer (Website/LinkedIn/Register) gefunden.",
              `Starke Evidenz-Signale: ${strongSignalCount}/3 (mindestens 2 erforderlich).`,
            ]
          : [
              "No reliable public signals (website/LinkedIn/register) found.",
              `Strong evidence signals: ${strongSignalCount}/3 (at least 2 required).`,
            ],
    };
  } else {
    const enrichment = await runCompanyEnrichment({
      companyId: params.companyId,
      companyName,
      website,
      location,
      locale: params.locale,
    });
    if (!enrichment.ok) {
      payload = {
        company_exists: true,
        status: "enrichment_failed",
        message: enrichment.error,
        company_snapshot: {
          company_name: companyName,
          website,
          location,
        },
        evidence: {
          website_excerpt_found: Boolean(websiteText),
          linkedIn_search_source: linkedInCtx.source,
          public_finance_search_source: publicFinanceCtx.source,
        },
      };
    } else {
      const refreshedProfile = await prisma.companyProfile.findFirst({
        where: { companyId: params.companyId },
        orderBy: { version: "desc" },
      });
      const enriched = (refreshedProfile?.profileJson as Record<string, unknown>) ?? {};
      const detailScore = [
        hasMeaningfulString(enriched.offer) ? 1 : 0,
        hasMeaningfulString(enriched.usp) ? 1 : 0,
        hasMeaningfulString(enriched.customers) ? 1 : 0,
        hasMeaningfulString(enriched.competitors) ? 1 : 0,
        hasMeaningfulString(enriched.sales_channels) ? 1 : 0,
      ].reduce((a, b) => a + b, 0);
      const isClearlyExisting =
        strongSignalCount >= 2 &&
        detailScore >= 3 &&
        String(enriched.business_state ?? "").toLowerCase() !== "idea";

      payload = {
        company_exists: isClearlyExisting,
        status: isClearlyExisting ? "existing_enriched" : "pre_foundation",
        message:
          params.locale === "de"
            ? isClearlyExisting
              ? "Öffentliche Unternehmensinformationen wurden gesammelt und ins Profil übernommen."
              : "Öffentliche Signale sind noch zu schwach/unklar – vermutlich vor Gründung oder noch nicht ausreichend öffentlich sichtbar."
            : isClearlyExisting
              ? "Public company information was collected and merged into the profile."
              : "Public signals are still too weak/unclear - likely pre-foundation or not sufficiently visible yet.",
        company_snapshot: {
          company_name: String(enriched.company_name ?? companyName),
          website: String(enriched.website ?? website),
          location: String(enriched.location ?? location),
          offer: typeof enriched.offer === "string" ? enriched.offer : undefined,
          usp: typeof enriched.usp === "string" ? enriched.usp : undefined,
          customers: typeof enriched.customers === "string" ? enriched.customers : undefined,
          competitors: typeof enriched.competitors === "string" ? enriched.competitors : undefined,
          sales_channels: typeof enriched.sales_channels === "string" ? enriched.sales_channels : undefined,
          stage: typeof enriched.stage === "string" ? enriched.stage : undefined,
          business_state: typeof enriched.business_state === "string" ? enriched.business_state : undefined,
          team_size: enriched.team_size as unknown,
          years_in_business: enriched.years_in_business as unknown,
          revenue_last_month: enriched.revenue_last_month as unknown,
        },
        evidence: {
          website_excerpt_found: Boolean(websiteText),
          linkedIn_search_source: linkedInCtx.source,
          public_finance_search_source: publicFinanceCtx.source,
        },
        notes:
          params.locale === "de"
            ? [
                `Starke Evidenz-Signale: ${strongSignalCount}/3 (mindestens 2 erforderlich).`,
                `Detail-Score aus Profilfeldern: ${detailScore}/5.`,
              ]
            : [
                `Strong evidence signals: ${strongSignalCount}/3 (at least 2 required).`,
                `Detail score from profile fields: ${detailScore}/5.`,
              ],
      };
    }
  }

  const latestForExistence = await prisma.companyProfile.findFirst({
    where: { companyId: params.companyId },
    orderBy: { version: "desc" },
  });
  const mergedExistenceProfile = {
    ...(typeof latestForExistence?.profileJson === "object"
      ? (latestForExistence.profileJson as Record<string, unknown>)
      : {}),
    company_exists: Boolean(payload.company_exists),
    company_exists_status: String(payload.status ?? ""),
    company_exists_message: typeof payload.message === "string" ? payload.message : null,
    updated_at: new Date().toISOString(),
  };
  await prisma.companyProfile.create({
    data: {
      companyId: params.companyId,
      version: (latestForExistence?.version ?? 0) + 1,
      profileJson: mergedExistenceProfile,
      completenessScore: latestForExistence?.completenessScore ?? 0.2,
    },
  });

  return WorkflowService.saveStep({
    runId: params.runId,
    stepKey: "company_internet_enrichment",
    schemaKey: "company_internet_presence",
    promptRendered: "[internal] company internet enrichment workflow",
    userResponse: JSON.stringify(payload),
    promptTemplateVersion: 1,
    autoVerify: true,
  });
}

function resolveTemperature(model: string): number {
  const m = model.toLowerCase();
  if (m.includes("kimi") || m.includes("moonshot")) return 1;
  return 0.3;
}

function supportsJsonMode(model: string): boolean {
  const m = model.toLowerCase();
  return !(m.includes("kimi") || m.includes("moonshot"));
}

export async function executeRunStepForCompany(params: {
  companyId: string;
  runId: string;
  stepKey: string;
  /** Optional override — nötig für Background-Worker ohne Request-Kontext. */
  locale?: "de" | "en";
}) {
  const run = await prisma.run.findUnique({
    where: { id: params.runId },
    include: { steps: true },
  });
  if (!run || run.companyId !== params.companyId) throw new Error("Run not found");

  const steps = workflowSteps[run.workflowKey] ?? [];
  const stepConfig = steps.find((s) => s.stepKey === params.stepKey);
  if (!stepConfig || stepConfig.schemaKey === "business_form") throw new Error("Invalid step");

  const runStepsLatest = run.steps.reduce<typeof run.steps>((acc, step) => {
    const existing = acc.find((s) => s.stepKey === step.stepKey);
    if (!existing || new Date(step.createdAt) > new Date(existing.createdAt)) {
      return [...acc.filter((s) => s.stepKey !== step.stepKey), step];
    }
    return acc;
  }, []);

  const freshBase = (await ContextPackService.build(run.companyId, run.workflowKey)) as unknown as Record<string, unknown>;
  const needsMergedContext = [
    "kpi_gap_scan",
    "industry_research",
    "financial_planning",
    "financial_monthly_h1",
    "financial_monthly_h2",
    "app_requirements",
    "app_tech_spec",
    "app_mvp_guide",
    "app_page_specs",
    "app_db_schema",
  ].includes(params.stepKey);
  let contextPack = needsMergedContext ? mergeRunStepsIntoContext(freshBase, runStepsLatest, params.stepKey) : freshBase;
  contextPack = filterContextForStep(contextPack, run.workflowKey, params.stepKey);

  const locale = params.locale ?? (await getServerLocale());

  if (params.stepKey === "company_internet_enrichment") {
    return executeCompanyInternetEnrichmentStep({
      runId: run.id,
      companyId: run.companyId,
      locale,
    });
  }

  const prompt = renderPrompt(run.workflowKey, params.stepKey, contextPack, locale);
  const promptRendered = prompt.rendered.replace("{{USER_NOTES}}", (run.userNotes ?? "").trim() || "(keine)");

  const settings = await prisma.companySettings.findUnique({
    where: { companyId: run.companyId },
  });
  const url = settings?.llmApiUrl?.trim();
  const apiKey = settings?.llmApiKey?.trim();
  const model = settings?.llmModel?.trim() || "gpt-4o-mini";
  const temperature = resolveTemperature(model);
  if (!url) throw new Error("LLM-API nicht konfiguriert");

  const baseUrl = url.replace(/\/$/, "");
  const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const payloadWithJsonMode: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: promptRendered }],
    temperature,
    response_format: { type: "json_object" as const },
  };
  const payloadPlain: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: promptRendered }],
    temperature,
  };

  let llmRes: Response;
  if (supportsJsonMode(model)) {
    llmRes = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadWithJsonMode);
    if (!llmRes.ok) {
      const firstErr = await llmRes.text();
      const status = llmRes.status;
      if (status === 401 || status === 403) throw new Error(`LLM-API Fehler (${status}): ${firstErr.slice(0, 300)}`);
      llmRes = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadPlain);
      if (!llmRes.ok) {
        const secondErr = await llmRes.text();
        throw new Error(
          `LLM-API Fehler (${status}, erneuter Versuch ${llmRes.status}): ${firstErr.slice(0, 160)} … ${secondErr.slice(0, 160)}`
        );
      }
    }
  } else {
    llmRes = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadPlain);
    if (!llmRes.ok) {
      const errText = await llmRes.text();
      throw new Error(`LLM-API Fehler (${llmRes.status}): ${errText.slice(0, 300)}`);
    }
  }

  const rawLlmBody = await llmRes.text();
  let llmData: { error?: { message?: string } };
  try {
    llmData = JSON.parse(rawLlmBody) as { error?: { message?: string } };
  } catch {
    throw new Error(
      `LLM-Antwort ist kein gültiges JSON (${rawLlmBody.length} Zeichen empfangen). Bitte erneut versuchen.`
    );
  }
  if (llmData.error?.message) throw new Error(`LLM-API: ${String(llmData.error.message).slice(0, 500)}`);
  const content = extractAssistantTextFromChatCompletion(llmData);
  if (!content.trim()) throw new Error("Leere Antwort vom Modell");

  const result = await WorkflowService.saveStep({
    runId: run.id,
    stepKey: params.stepKey,
    schemaKey: stepConfig.schemaKey as SchemaKey,
    promptRendered,
    userResponse: content,
    promptTemplateVersion: prompt.template.version,
    autoVerify: true,
  });
  if (!result.validation.ok) {
    throw new Error(`Schema validation failed: ${result.validation.errors.slice(0, 3).join("; ")}`);
  }
  return result;
}

export async function executePrimaryWorkflowStepForCompany(params: {
  companyId: string;
  workflowKey: string;
}) {
  const existing = await prisma.run.findFirst({
    where: {
      companyId: params.companyId,
      workflowKey: params.workflowKey,
      status: { in: ["draft", "running", "incomplete"] },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  let runId = existing?.id;
  if (!runId) {
    const contextPack = await ContextPackService.build(params.companyId, params.workflowKey);
    const run = await WorkflowService.createRun(params.companyId, params.workflowKey, contextPack);
    runId = run.id;
  }

  const autoSteps = (workflowSteps[params.workflowKey] ?? []).filter((s) => !MANUAL_STEP_KEYS.has(s.stepKey));
  const primary = autoSteps.at(-1);
  if (!primary) return null;
  return executeRunStepForCompany({
    companyId: params.companyId,
    runId,
    stepKey: primary.stepKey,
  });
}

async function ensureRunForWorkflow(params: { companyId: string; workflowKey: string }): Promise<string> {
  const existing = await prisma.run.findFirst({
    where: {
      companyId: params.companyId,
      workflowKey: params.workflowKey,
      status: { in: ["draft", "running", "incomplete"] },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.id) return existing.id;

  const contextPack = await ContextPackService.build(params.companyId, params.workflowKey);
  const run = await WorkflowService.createRun(params.companyId, params.workflowKey, contextPack);
  return run.id;
}

/**
 * Execute all auto-runnable steps for a workflow in order.
 * Each step uses the same API path semantics as the KI run button:
 * prompt render -> LLM request -> save -> schema verify -> artifact generation.
 */
export async function executeWorkflowForCompany(params: {
  companyId: string;
  workflowKey: string;
  locale?: "de" | "en";
}): Promise<{ runId: string; executedStepKeys: string[] }> {
  const runId = await ensureRunForWorkflow(params);
  const autoSteps = (workflowSteps[params.workflowKey] ?? []).filter((s) => !MANUAL_STEP_KEYS.has(s.stepKey));
  const executedStepKeys: string[] = [];
  for (const step of autoSteps) {
    await executeRunStepForCompany({
      companyId: params.companyId,
      runId,
      stepKey: step.stepKey,
      locale: params.locale,
    });
    executedStepKeys.push(step.stepKey);
  }
  return { runId, executedStepKeys };
}

