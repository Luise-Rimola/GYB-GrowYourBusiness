import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { getScenarioById } from "@/lib/scenarios";
import { buildScenarioEvaluationContext } from "@/services/chatAdvisor";
import {
  SCENARIO_EVALUATION_SYSTEM_PROMPT_DE,
  buildScenarioEvaluationUserPromptDe,
} from "@/lib/scenarioEvaluationPrompt";

export type ScenarioAnswerResponse = {
  answer: string;
  confidence: number;
  sources: { title: string; type?: string; url?: string }[];
};

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;
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

    const body = await req.json();
    const scenarioId = typeof body.scenarioId === "number" ? body.scenarioId : Number(body.scenarioId);
    const userNotes = typeof body.userNotes === "string" ? body.userNotes.trim() : "";
    const userAnswer = typeof body.userAnswer === "string" ? body.userAnswer.trim() : "";

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Szenario nicht gefunden" }, { status: 400 });
    }

    const companyContext = await buildScenarioEvaluationContext(company.id);
    const userPrompt = buildScenarioEvaluationUserPromptDe({
      scenarioId,
      scenario,
      companyContext,
      userNotes,
      userAnswer,
    });
    const systemPrompt = SCENARIO_EVALUATION_SYSTEM_PROMPT_DE;

    const baseUrl = url.replace(/\/$/, "");
    const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `LLM-API Fehler (${res.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const rawContent = data.choices?.[0]?.message?.content ?? "";

    let answer = rawContent;
    let confidence = 50;
    let sources: { title: string; type?: string; url?: string }[] = [];

    const preferredMatches = Array.from(rawContent.matchAll(/(?:^|\n)[^\n]*(?!KI-)(?:Konfidenz|Confidence)[^0-9\n]{0,12}(\d{1,3})\s*%?/gim));
    const fallbackMatches = Array.from(rawContent.matchAll(/(?:^|\n)[^\n]*(?:KI-)?(?:Konfidenz|Confidence)[^0-9\n]{0,12}(\d{1,3})\s*%?/gim));
    const matchToUse = (preferredMatches.length > 0 ? preferredMatches : fallbackMatches).at(-1);
    if (matchToUse?.[1]) {
      confidence = Math.min(100, Math.max(0, parseInt(matchToUse[1], 10)));
      answer = answer
        .replace(/^.*(?:KI-)?(?:Konfidenz|Confidence)[^0-9\n]{0,12}\d{1,3}\s*%?.*$/gim, "")
        .trim();
    }

    const jsonBlockMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try {
        const parsed = JSON.parse(jsonBlockMatch[1].trim()) as unknown;
        if (Array.isArray(parsed)) {
          sources = parsed
            .filter((s): s is { title?: string; type?: string; url?: string } => s && typeof s === "object")
            .map((s) => ({ title: String(s.title ?? ""), type: s.type, url: s.url }));
        }
      } catch {
        // ignore parse errors
      }
    }

    return NextResponse.json({
      answer: answer.replace(/```(?:json)?[\s\S]*?```/g, "").trim(),
      confidence,
      sources,
    } satisfies ScenarioAnswerResponse);
  } catch (err) {
    console.error("[evaluation/scenario-answer] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM-Anfrage fehlgeschlagen" },
      { status: 500 }
    );
  }
}
