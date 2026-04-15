import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { renderPrompt } from "@/lib/promptRenderer";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { mergeRunStepsIntoContext, workflowSteps, MANUAL_STEP_KEYS } from "@/lib/workflowSteps";
import { filterContextForStep } from "@/services/contextPack";
import { SchemaKey } from "@/types/schemas";
import { getServerLocale } from "@/lib/locale";
import { fetchChatCompletionWithTemperatureRetry } from "@/lib/llmTemperatureRetry";
import { extractAssistantTextFromChatCompletion } from "@/lib/openAiChatContent";

export const maxDuration = 300;

export async function POST(req: Request) {
  const debugId = `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;
    const body = await req.json();
    const runId = String(body.runId ?? "");
    const stepKey = String(body.stepKey ?? "");

    if (!runId || !stepKey) {
      return NextResponse.json({ error: "runId and stepKey required" }, { status: 400 });
    }

    if (MANUAL_STEP_KEYS.has(stepKey)) {
      return NextResponse.json({ error: `Step ${stepKey} requires manual input` }, { status: 400 });
    }

    const run = await prisma.run.findUnique({
      where: { id: runId },
      include: { steps: true },
    });

    if (!run || run.companyId !== company.id) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const steps = workflowSteps[run.workflowKey] ?? [];
    const stepConfig = steps.find((s) => s.stepKey === stepKey);
    if (!stepConfig || stepConfig.schemaKey === "business_form") {
      return NextResponse.json({ error: "Invalid step", debugId }, { status: 400 });
    }

    const runStepsLatest = run.steps.reduce<typeof run.steps>((acc, step) => {
      const existing = acc.find((s) => s.stepKey === step.stepKey);
      if (!existing || new Date(step.createdAt) > new Date(existing.createdAt)) {
        return [...acc.filter((s) => s.stepKey !== step.stepKey), step];
      }
      return acc;
    }, []);

    const freshBase = (await ContextPackService.build(run.companyId, run.workflowKey)) as unknown as Record<string, unknown>;
    const needsMergedContext = ["kpi_gap_scan", "industry_research", "financial_planning", "financial_monthly_h1", "financial_monthly_h2", "app_requirements", "app_tech_spec", "app_mvp_guide", "app_page_specs", "app_db_schema"].includes(stepKey);
    let contextPack = needsMergedContext ? mergeRunStepsIntoContext(freshBase, runStepsLatest, stepKey) : freshBase;
    contextPack = filterContextForStep(contextPack, run.workflowKey, stepKey);

    const locale = await getServerLocale();
    const prompt = renderPrompt(run.workflowKey, stepKey, contextPack, locale);
    const promptRendered = prompt.rendered.replace("{{USER_NOTES}}", (run.userNotes ?? "").trim() || "(keine)");

    const settings = await prisma.companySettings.findUnique({
      where: { companyId: company.id },
    });
    const url = settings?.llmApiUrl?.trim();
    const apiKey = settings?.llmApiKey?.trim();
    const model = settings?.llmModel?.trim() || "gpt-4o-mini";

    if (!url) {
      return NextResponse.json(
        { error: "LLM-API nicht konfiguriert. Bitte in Einstellungen konfigurieren.", debugId },
        { status: 400 }
      );
    }

    const baseUrl = url.replace(/\/$/, "");
    const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const payloadWithJsonMode: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: promptRendered }],
      temperature: 0.3,
      response_format: { type: "json_object" as const },
    };

    const payloadPlain: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: promptRendered }],
      temperature: 0.3,
    };

    let llmRes = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadWithJsonMode);

    if (!llmRes.ok) {
      const firstErr = await llmRes.text();
      const status = llmRes.status;
      if (status === 401 || status === 403) {
        return NextResponse.json(
          { error: `LLM-API Fehler (${status}): ${firstErr.slice(0, 300)}` },
          { status: 502 }
        );
      }
      llmRes = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadPlain);
      if (!llmRes.ok) {
        const secondErr = await llmRes.text();
        return NextResponse.json(
          {
            error: `LLM-API Fehler (${status}, erneuter Versuch ${llmRes.status}): ${firstErr.slice(0, 160)} … ${secondErr.slice(0, 160)}`,
          },
          { status: 502 }
        );
      }
    }

    const llmData = (await llmRes.json()) as { error?: { message?: string }; choices?: unknown };
    if (llmData.error?.message) {
      return NextResponse.json(
        { error: `LLM-API: ${String(llmData.error.message).slice(0, 500)}` },
        { status: 502 }
      );
    }

    const content = extractAssistantTextFromChatCompletion(llmData);
    console.info(`[run-step/execute][${debugId}] model response`, {
      runId,
      workflowKey: run.workflowKey,
      stepKey,
      schemaKey: stepConfig.schemaKey,
      model,
      contentLength: content.length,
      contentPreview: content.slice(0, 300),
    });

    if (!content.trim()) {
      console.warn(`[run-step/execute][${debugId}] empty assistant text; snippet:`, JSON.stringify(llmData).slice(0, 1200));
      return NextResponse.json(
        {
          error:
            "Leere Antwort vom Modell. Bitte Endpoint/Modell prüfen oder Schritt erneut ausführen.",
          debugId,
        },
        { status: 502 }
      );
    }

    const result = await WorkflowService.saveStep({
      runId,
      stepKey,
      schemaKey: stepConfig.schemaKey as SchemaKey,
      promptRendered,
      userResponse: content,
      promptTemplateVersion: prompt.template.version,
      autoVerify: true,
    });

    if (!result.validation.ok) {
      console.warn(`[run-step/execute][${debugId}] schema validation failed`, {
        runId,
        workflowKey: run.workflowKey,
        stepKey,
        schemaKey: stepConfig.schemaKey,
        errors: result.validation.errors,
      });
      return NextResponse.json(
        {
          error: "Die KI-Antwort erfüllt das JSON-Schema für diesen Schritt nicht.",
          validationErrors: result.validation.errors,
          schemaValidationPassed: false,
          stepKey,
          debugId,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      schemaValidationPassed: true,
      stepKey,
      userPastedResponse: content,
      debugId,
    });
  } catch (err) {
    console.error(`[run-step/execute][${debugId}] error:`, err);
    const isHeadersTimeout =
      typeof err === "object" &&
      err !== null &&
      "cause" in err &&
      typeof (err as { cause?: unknown }).cause === "object" &&
      (err as { cause?: { code?: string } }).cause?.code === "UND_ERR_HEADERS_TIMEOUT";
    const errorText = isHeadersTimeout
      ? "LLM-Provider Timeout beim Verbindungsaufbau (Header-Timeout). Bitte erneut starten oder Provider/Modell wechseln."
      : err instanceof Error
        ? err.message
        : "Step execution failed";
    return NextResponse.json(
      { error: errorText, debugId },
      { status: 500 }
    );
  }
}
