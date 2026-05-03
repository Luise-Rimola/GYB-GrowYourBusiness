import { NextResponse } from "next/server";
import { getCompanyForApi } from "@/lib/companyContext";
import { getScenarioById } from "@/lib/scenarios";
import { buildScenarioEvaluationContext } from "@/services/chatAdvisor";
import { buildScenarioEvaluationFullPromptDe } from "@/lib/scenarioEvaluationPrompt";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;
    const body = await req.json();
    const scenarioId = typeof body.scenarioId === "number" ? body.scenarioId : Number(body.scenarioId);
    const userNotes = typeof body.userNotes === "string" ? body.userNotes.trim() : "";
    const userAnswer = typeof body.userAnswer === "string" ? body.userAnswer.trim() : "";

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Szenario nicht gefunden" }, { status: 400 });
    }

    const companyContext = await buildScenarioEvaluationContext(company.id);
    const prompt = buildScenarioEvaluationFullPromptDe({
      scenarioId,
      scenario,
      companyContext,
      userNotes,
      userAnswer,
    });

    return NextResponse.json({ prompt });
  } catch (err) {
    console.error("[evaluation/scenario-prompt] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prompt konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
