import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { getScenarioById } from "@/lib/scenarios";
import { buildScenarioEvaluationContext } from "@/services/chatAdvisor";

export async function POST(req: Request) {
  try {
    const auth = await getCompanyForApi();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { company } = auth;
    const body = await req.json();
    const scenarioId = typeof body.scenarioId === "number" ? body.scenarioId : Number(body.scenarioId);

    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Szenario nicht gefunden" }, { status: 400 });
    }

    const companyContext = await buildScenarioEvaluationContext(company.id);
    const kpiList = scenario.kpis.join(", ");

    const systemPrompt = `Du bist ein Unternehmensberater. Du beantwortest strategische Entscheidungsfragen auf Basis von Unternehmensdaten, Dokumenten und Run-Ergebnissen.
Entscheide unabhängig und praxisnah. Antworte strukturiert mit klaren Empfehlungen.
Am Ende gibst du deine Konfidenz in Prozent (0–100) und Quellen an.`;

    const userPrompt = `## Szenario (ID ${scenarioId})
**Frage:** ${scenario.question}

**Relevante KPIs:** ${kpiList}

## Unternehmensdaten (Profil, Dokumente, Runs)
${companyContext}

---

Beantworte die Frage mit:
1. Kurzantwort (genau 1 Wort, z.B. "Ja", "Nein", "Unsicher") als eigene Zeile: "Kurzantwort: X"
2. Empfehlung (2–4 Sätze, klar und handlungsorientiert)
3. Konfidenz (0–100 %, als Zahl am Ende: "Konfidenz: X%")
4. Quellen (als JSON-Array am Ende, z.B. [{"title":"Branchenstudie XY","type":"report"},{"title":"Best Practice X","type":"internal"}])
Verwende KEINE Markdown-Sternchen in Überschriften (kein **...**).
Format: \`\`\`json
[{"title":"...","type":"report|internal|web|estimate"}]
\`\`\``;

    const fullPrompt = `=== SYSTEM ===\n${systemPrompt}\n\n=== USER ===\n${userPrompt}`;

    return NextResponse.json({ prompt: fullPrompt });
  } catch (err) {
    console.error("[evaluation/scenario-prompt] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Prompt konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
