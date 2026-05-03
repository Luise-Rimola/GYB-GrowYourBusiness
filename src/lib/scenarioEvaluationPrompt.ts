/**
 * Szenario-Evaluierung: fester Prompt-Rahmen + eingefügter Unternehmens-Kontext.
 * Eine Quelle für UI (sofort, ohne API) und für scenario-answer (LLM).
 */

import type { Scenario } from "@/lib/scenarios";

export const SCENARIO_EVALUATION_SYSTEM_PROMPT_DE = `Du bist ein Unternehmensberater. Du beantwortest strategische Entscheidungsfragen auf Basis von Unternehmensdaten, Dokumenten und Run-Ergebnissen.
Entscheide unabhängig und praxisnah. Antworte strukturiert mit klaren Empfehlungen.
Am Ende gibst du deine Konfidenz in Prozent (0–100) und Quellen an.`;

const INSTRUCTION_BLOCK_DE = `Beantworte die Frage mit:
1. Kurzantwort (genau 1 Wort, z.B. "Ja", "Nein", "Unsicher") als eigene Zeile: "Kurzantwort: X"
2. Empfehlung (2–4 Sätze, klar und handlungsorientiert)
3. Konfidenz (0–100 %, als Zahl am Ende: "Konfidenz: X%")
4. Quellen (als JSON-Array am Ende, z.B. [{"title":"Branchenstudie XY","type":"report"},{"title":"Best Practice X","type":"internal"}])
Verwende KEINE Markdown-Sternchen in Überschriften (kein **...**).
Format: \`\`\`json
[{"title":"...","type":"report|internal|web|estimate"}]
\`\`\``;

export function buildScenarioEvaluationUserPromptDe(params: {
  scenarioId: number;
  scenario: Pick<Scenario, "question" | "kpis">;
  companyContext: string;
  userNotes: string;
  userAnswer: string;
}): string {
  const kpiList = params.scenario.kpis.join(", ");
  const answer = params.userAnswer.trim();
  const notes = params.userNotes.trim();
  const answerBlock = answer
    ? `## Ihre Antwort (Schritt 1)\n${answer}\n\n---\n\n`
    : "";
  const notesBlock = notes ? `## Zusätzliche Notizen des Nutzers\n${notes}\n\n---\n\n` : "";
  return `## Szenario (ID ${params.scenarioId})
**Frage:** ${params.scenario.question}

**Relevante KPIs:** ${kpiList}

${answerBlock}## Unternehmensdaten (Profil, Dokumente, Runs)
${params.companyContext}

---

${notesBlock}${INSTRUCTION_BLOCK_DE}`;
}

export function buildScenarioEvaluationFullPromptDe(params: {
  scenarioId: number;
  scenario: Pick<Scenario, "question" | "kpis">;
  companyContext: string;
  userNotes: string;
  userAnswer: string;
}): string {
  const user = buildScenarioEvaluationUserPromptDe(params);
  return `=== SYSTEM ===\n${SCENARIO_EVALUATION_SYSTEM_PROMPT_DE}\n\n=== USER ===\n${user}`;
}
