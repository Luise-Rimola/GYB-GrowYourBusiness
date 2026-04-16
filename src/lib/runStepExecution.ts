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

  const locale = await getServerLocale();
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
}): Promise<{ runId: string; executedStepKeys: string[] }> {
  const runId = await ensureRunForWorkflow(params);
  const autoSteps = (workflowSteps[params.workflowKey] ?? []).filter((s) => !MANUAL_STEP_KEYS.has(s.stepKey));
  const executedStepKeys: string[] = [];
  for (const step of autoSteps) {
    await executeRunStepForCompany({
      companyId: params.companyId,
      runId,
      stepKey: step.stepKey,
    });
    executedStepKeys.push(step.stepKey);
  }
  return { runId, executedStepKeys };
}

