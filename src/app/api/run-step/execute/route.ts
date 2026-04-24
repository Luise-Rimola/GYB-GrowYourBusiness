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

/** Align with `LLM_UPSTREAM_FETCH_MS` / client aborts (long Kimi runs). */
export const maxDuration = 300;

/** Omit full text from JSON to the browser — DB still stores complete response; client uses router.refresh(). */
const MAX_USER_RESPONSE_IN_JSON_CHARS = 120_000;

function collectBalancedJsonCandidates(text: string): string[] {
  const s = text.trim();
  if (!s) return [];
  const candidates: string[] = [];
  const seen = new Set<string>();

  if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
    seen.add(s);
    candidates.push(s);
  }

  for (let start = 0; start < s.length; start++) {
    const opener = s[start];
    if (opener !== "{" && opener !== "[") continue;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{" || ch === "[") depth++;
      if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) {
          const candidate = s.slice(start, i + 1).trim();
          if (!seen.has(candidate)) {
            seen.add(candidate);
            candidates.push(candidate);
          }
          break;
        }
      }
    }
  }
  return candidates;
}

function isTinyArrayReferenceJson(s: string): boolean {
  const t = s.trim();
  return /^\[\s*\d{1,4}(?:\s*,\s*\d{1,4})*\s*\]$/.test(t);
}

function pickBestEffortJsonCandidate(text: string): string | null {
  const candidates = collectBalancedJsonCandidates(text);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const objectScoreA = a.trim().startsWith("{") ? 1 : 0;
    const objectScoreB = b.trim().startsWith("{") ? 1 : 0;
    if (objectScoreA !== objectScoreB) return objectScoreB - objectScoreA;
    const tinyPenaltyA = isTinyArrayReferenceJson(a) ? 1 : 0;
    const tinyPenaltyB = isTinyArrayReferenceJson(b) ? 1 : 0;
    if (tinyPenaltyA !== tinyPenaltyB) return tinyPenaltyA - tinyPenaltyB;
    return b.length - a.length;
  });
  const best = candidates[0] ?? null;
  if (!best) return null;

  // Safety rail: if answer is long, never settle on trivial citation-like arrays such as "[1]".
  if (isTinyArrayReferenceJson(best) && text.trim().length > 1000) {
    const stronger = candidates.find((c) => !isTinyArrayReferenceJson(c) && c.length > best.length);
    if (stronger) return stronger;
  }
  return best;
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

export async function POST(req: Request) {
  const debugId = `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;
    let body: { runId?: unknown; stepKey?: unknown };
    try {
      const raw = await req.text();
      body = raw.trim() ? (JSON.parse(raw) as typeof body) : {};
    } catch (parseErr) {
      console.error(`[run-step/execute][${debugId}] request JSON.parse failed`, parseErr);
      return NextResponse.json({ error: "Ungültiger Request-Body.", debugId }, { status: 400 });
    }
    const runId = String(body.runId ?? "");
    const stepKey = String(body.stepKey ?? "");
    console.info(`[run-step/execute][${debugId}] start`, { runId, stepKey });

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
    const temperature = resolveTemperature(model);

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
    let upstreamHost = "";
    try {
      upstreamHost = new URL(chatUrl).host;
    } catch {
      upstreamHost = "(invalid-url)";
    }
    console.info(`[run-step/execute][${debugId}] upstream start`, {
      runId,
      stepKey,
      workflowKey: run.workflowKey,
      model,
      upstreamHost,
      hasApiKey: Boolean(apiKey),
    });

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
      console.info(`[run-step/execute][${debugId}] upstream response`, {
        runId,
        stepKey,
        status: llmRes.status,
        ok: llmRes.ok,
      });
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
        console.info(`[run-step/execute][${debugId}] upstream retry response`, {
          runId,
          stepKey,
          status: llmRes.status,
          ok: llmRes.ok,
        });
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
    } else {
      llmRes = await fetchChatCompletionWithTemperatureRetry(chatUrl, headers, payloadPlain);
      console.info(`[run-step/execute][${debugId}] upstream response`, {
        runId,
        stepKey,
        status: llmRes.status,
        ok: llmRes.ok,
      });
      if (!llmRes.ok) {
        const errText = await llmRes.text();
        return NextResponse.json(
          { error: `LLM-API Fehler (${llmRes.status}): ${errText.slice(0, 300)}` },
          { status: 502 }
        );
      }
    }

    const rawLlmBody = await llmRes.text();
    const persistRawResponse = async (raw: string): Promise<boolean> => {
      try {
        await WorkflowService.saveStep({
          runId,
          stepKey,
          schemaKey: stepConfig.schemaKey as SchemaKey,
          promptRendered,
          userResponse: raw,
          promptTemplateVersion: prompt.template.version,
          autoVerify: false,
        });
        return true;
      } catch (persistErr) {
        console.error(`[run-step/execute][${debugId}] persist raw response failed`, persistErr);
        return false;
      }
    };
    let llmData: unknown;
    try {
      llmData = JSON.parse(rawLlmBody) as { error?: { message?: string }; choices?: unknown };
    } catch {
      console.error(`[run-step/execute][${debugId}] LLM response JSON.parse failed`, {
        runId,
        stepKey,
        bodyLength: rawLlmBody.length,
        head: rawLlmBody.slice(0, 400),
        tail: rawLlmBody.slice(-400),
      });
      const persisted = await persistRawResponse(rawLlmBody);
      return NextResponse.json(
        {
          error: persisted
            ? "Die LLM-Antwort war kein gültiges JSON. Die Rohantwort wurde im Schritt gespeichert — bitte prüfen oder erneut ausführen."
            : "Die LLM-Antwort war kein gültiges JSON und konnte nicht gespeichert werden. Bitte erneut ausführen.",
          persisted,
          debugId,
        },
        { status: 422 }
      );
    }

    const errMsg = (llmData as { error?: { message?: string } }).error?.message;
    if (errMsg) {
      const persisted = await persistRawResponse(rawLlmBody);
      return NextResponse.json(
        {
          error: `LLM-API: ${String(errMsg).slice(0, 500)}`,
          persisted,
          debugId,
        },
        { status: 502 }
      );
    }

    const content = extractAssistantTextFromChatCompletion(llmData);
    const normalizedContent = pickBestEffortJsonCandidate(content) ?? content;
    console.info(`[run-step/execute][${debugId}] model response`, {
      runId,
      workflowKey: run.workflowKey,
      stepKey,
      schemaKey: stepConfig.schemaKey,
      model,
      contentLength: content.length,
      contentPreview: content.slice(0, 300),
      normalizedLength: normalizedContent.length,
    });

    if (!normalizedContent.trim()) {
      console.warn(`[run-step/execute][${debugId}] empty assistant text; snippet:`, JSON.stringify(llmData).slice(0, 1200));
      const persisted = await persistRawResponse(rawLlmBody);
      return NextResponse.json(
        {
          error: persisted
            ? "Leere/unerwartete Modellantwort. Die Rohantwort wurde im Schritt gespeichert — bitte prüfen oder erneut ausführen."
            : "Leere/unerwartete Modellantwort und Rohantwort konnte nicht gespeichert werden. Bitte erneut ausführen.",
          persisted,
          debugId,
        },
        { status: 422 }
      );
    }

    if (isTinyArrayReferenceJson(normalizedContent) && rawLlmBody.length > 5000) {
      console.warn(`[run-step/execute][${debugId}] rejected tiny-array extraction`, {
        runId,
        stepKey,
        normalizedContent,
        rawLlmBodyLength: rawLlmBody.length,
      });
      return NextResponse.json(
        {
          error:
            "Die Modellantwort konnte nicht korrekt als JSON extrahiert werden (Mini-Array erkannt). Der vorherige Schrittstand wurde nicht überschrieben. Bitte erneut ausführen.",
          debugId,
        },
        { status: 422 }
      );
    }

    const result = await WorkflowService.saveStep({
      runId,
      stepKey,
      schemaKey: stepConfig.schemaKey as SchemaKey,
      promptRendered,
      userResponse: normalizedContent,
      promptTemplateVersion: prompt.template.version,
      autoVerify: true,
    });

    console.info(`[run-step/execute][${debugId}] saved RunStep`, {
      runId,
      stepKey,
      stepId: result.step.id,
      schemaOk: result.validation.ok,
      storedLength: normalizedContent.length,
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
          error:
            "Die KI-Antwort erfüllt das JSON-Schema für diesen Schritt nicht. Die Rohantwort wurde im Schritt gespeichert — bitte im Antwortfeld prüfen oder manuell korrigieren.",
          validationErrors: result.validation.errors,
          schemaValidationPassed: false,
          stepKey,
          persisted: true,
          debugId,
        },
        { status: 422 }
      );
    }

    if (normalizedContent.length > MAX_USER_RESPONSE_IN_JSON_CHARS) {
      return NextResponse.json({
        success: true,
        schemaValidationPassed: true,
        stepKey,
        largeResponseSaved: true,
        contentLength: normalizedContent.length,
        debugId,
      });
    }

    return NextResponse.json({
      success: true,
      schemaValidationPassed: true,
      stepKey,
      userPastedResponse: normalizedContent,
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
    const isGenericTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || /aborted due to timeout/i.test(err.message));
    const errorText = isHeadersTimeout || isGenericTimeout
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
