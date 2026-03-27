import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { renderPrompt } from "@/lib/promptRenderer";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { mergeRunStepsIntoContext, workflowSteps, MANUAL_STEP_KEYS } from "@/lib/workflowSteps";
import { filterContextForStep } from "@/services/contextPack";
import { SchemaKey } from "@/types/schemas";

export async function POST(req: Request) {
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
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
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

    const prompt = renderPrompt(run.workflowKey, stepKey, contextPack);
    const promptRendered = prompt.rendered.replace("{{USER_NOTES}}", (run.userNotes ?? "").trim() || "(keine)");

    const settings = await prisma.companySettings.findUnique({
      where: { companyId: company.id },
    });
    const url = settings?.llmApiUrl?.trim();
    const apiKey = settings?.llmApiKey?.trim();
    const model = settings?.llmModel?.trim() || "gpt-4o-mini";

    if (!url) {
      return NextResponse.json(
        { error: "LLM-API nicht konfiguriert. Bitte in Einstellungen konfigurieren." },
        { status: 400 }
      );
    }

    const baseUrl = url.replace(/\/$/, "");
    const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const llmRes = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: promptRendered }],
        temperature: 0.3,
      }),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      return NextResponse.json(
        { error: `LLM-API Fehler (${llmRes.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const llmData = (await llmRes.json()) as { choices?: { message?: { content?: string } }[] };
    const content = llmData.choices?.[0]?.message?.content ?? "";

    await WorkflowService.saveStep({
      runId,
      stepKey,
      schemaKey: stepConfig.schemaKey as SchemaKey,
      promptRendered,
      userResponse: content,
      promptTemplateVersion: prompt.template.version,
    });

    return NextResponse.json({ success: true, userPastedResponse: content });
  } catch (err) {
    console.error("[run-step/execute] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Step execution failed" },
      { status: 500 }
    );
  }
}
