import { getPromptTemplatesForLocale } from "@/prompts";

const STRATEGY_INDICATOR_TARGETS: Record<string, string[]> = {
  "WF_SWOT:swot_analysis": ["strength_score", "weakness_score", "opportunity_score", "threat_score"],
  "WF_COMPETITOR_ANALYSIS:competitor_analysis": ["competitive_intensity_index", "differentiation_score", "pricing_power_index"],
  "WF_MARKET:market_snapshot": ["market_attractiveness_score", "competitive_intensity_index", "threat_score"],
  "WF_RESEARCH:market_research": ["market_attractiveness_score", "strategic_fit_score", "evidence_confidence_score"],
  "WF_VALUE_PROPOSITION:value_proposition": ["strategic_fit_score", "differentiation_score", "pricing_power_index"],
  "WF_IDEA_USP_VALIDATION:value_proposition": ["strategic_fit_score", "differentiation_score"],
  "WF_GO_TO_MARKET:go_to_market": ["gtm_readiness_score", "pricing_power_index", "strategic_fit_score"],
  "WF_MARKETING_STRATEGY:marketing_strategy": ["gtm_readiness_score", "execution_feasibility_score"],
  "WF_FEASIBILITY_VALIDATION:scenario_analysis": ["execution_feasibility_score", "risk_exposure_score", "threat_score"],
  "WF_SCENARIO_ANALYSIS:scenario_analysis": ["risk_exposure_score", "threat_score", "execution_feasibility_score"],
  "WF_FINANCIAL_PLANNING:financial_planning": ["execution_feasibility_score", "risk_exposure_score"],
  "WF_CUSTOMER_VALIDATION:customer_validation": ["strategic_fit_score", "evidence_confidence_score", "gtm_readiness_score"],
  "WF_NEXT_BEST_ACTIONS:decision_engine": ["evidence_confidence_score", "risk_exposure_score", "gtm_readiness_score"],
};

const STRATEGY_INDICATOR_INSTRUCTION_EN = `
STRATEGY INDICATORS (required when possible):
- Add a top-level field "strategy_indicators".
- Return ONLY indicators that can be justified by this step output.
- Use indicator keys from CONTEXT_JSON.strategy_indicators (e.g. strength_score, weakness_score, opportunity_score, threat_score, competitive_intensity_index, market_attractiveness_score, strategic_fit_score, differentiation_score, pricing_power_index, gtm_readiness_score, execution_feasibility_score, risk_exposure_score, evidence_confidence_score).
- Value scale: mostly 0-100; for evidence_confidence_score use 0-1.
- Include confidence (0-1), short rationale, and optional evidence_grade (A-E).
Expected shape:
{
  "strategy_indicators": {
    "<indicator_key>": { "value": 0, "confidence": 0.0, "rationale": "...", "evidence_grade": "A" }
  }
}`;

const STRATEGY_INDICATOR_INSTRUCTION_DE = `
STRATEGIE-INDIKATOREN (wenn möglich verpflichtend):
- Füge ein Top-Level-Feld "strategy_indicators" hinzu.
- Gib NUR Indikatoren zurück, die durch das Ergebnis dieses Schritts begründbar sind.
- Nutze Indikator-Keys aus KONTEXT_JSON.strategy_indicators (z. B. strength_score, weakness_score, opportunity_score, threat_score, competitive_intensity_index, market_attractiveness_score, strategic_fit_score, differentiation_score, pricing_power_index, gtm_readiness_score, execution_feasibility_score, risk_exposure_score, evidence_confidence_score).
- Werteskala: meist 0-100; für evidence_confidence_score 0-1.
- Gib confidence (0-1), kurze Begründung und optional evidence_grade (A-E) an.
Erwartete Struktur:
{
  "strategy_indicators": {
    "<indicator_key>": { "value": 0, "confidence": 0.0, "rationale": "...", "evidence_grade": "A" }
  }
}`;

function formatPersonnelCostsForPrompt(contextJson: unknown): string {
  const ctx = contextJson as Record<string, unknown> | null;
  const personnel = ctx?.personnel_plan as { monthly_personnel_costs?: Array<{ month: string; total_personnel_eur: number }> } | null;
  const costs = personnel?.monthly_personnel_costs;
  if (!costs?.length) return "Nicht verfügbar – branchentypisch schätzen.";
  return costs
    .map((m) => `${m.month}: ${m.total_personnel_eur} EUR`)
    .join("\n");
}

export function renderPrompt(
  workflowKey: string,
  stepKey: string,
  contextJson: unknown,
  locale: "de" | "en" = "de"
) {
  const promptTemplates = getPromptTemplatesForLocale(locale);
  const template = promptTemplates.find(
    (item) => item.workflowKey === workflowKey && item.stepKey === stepKey
  );
  if (!template) {
    throw new Error(`Missing prompt template for ${workflowKey}:${stepKey}`);
  }

  // Token-Reduktion: Technologie-Workflows brauchen keine "Startup-Insights"-Blöcke.
  // Die werden sonst (bei fehlender/ungenauer Whitelist) komplett in den Prompt gepackt.
  let contextForPrompt = contextJson as unknown;
  if (["WF_APP_DEVELOPMENT", "WF_TECH_DIGITALIZATION", "WF_AUTOMATION_ROI", "WF_PHYSICAL_AUTOMATION", "WF_INVENTORY_LAUNCH"].includes(workflowKey)) {
    if (
      contextJson &&
      typeof contextJson === "object" &&
      !Array.isArray(contextJson) &&
      "startup_insights" in (contextJson as Record<string, unknown>)
    ) {
      contextForPrompt = { ...(contextJson as Record<string, unknown>) };
      delete (contextForPrompt as Record<string, unknown>).startup_insights;
    }
  }

  const contextString = JSON.stringify(contextForPrompt, null, 2);
  let rendered = template.templateText.replace("{{CONTEXT_JSON}}", contextString);
  if (workflowKey === "WF_FINANCIAL_PLANNING" && (stepKey === "financial_planning" || stepKey === "financial_monthly_h1" || stepKey === "financial_monthly_h2")) {
    const personnelCosts = formatPersonnelCostsForPrompt(contextJson);
    rendered = rendered.replace("{{PERSONNEL_COSTS}}", personnelCosts);
  }
  const strategyTargetKey = `${workflowKey}:${stepKey}`;
  const allowedIndicators = STRATEGY_INDICATOR_TARGETS[strategyTargetKey];
  if (allowedIndicators) {
    const strategyInstruction =
      locale === "de" ? STRATEGY_INDICATOR_INSTRUCTION_DE : STRATEGY_INDICATOR_INSTRUCTION_EN;
    const allowedLabel =
      locale === "de"
        ? "Erlaubte Indikator-Keys für diesen Schritt"
        : "Allowed indicator keys for this step";
    rendered += `\n\n${strategyInstruction}\n${allowedLabel}: ${allowedIndicators.join(", ")}.`;
  }
  rendered +=
    locale === "de"
      ? "\n\n--- NUTZERNOTIZEN (optional, zur Steuerung) ---\n{{USER_NOTES}}"
      : "\n\n--- USER NOTES (optional, for steering) ---\n{{USER_NOTES}}";
  if (locale === "de") {
    rendered +=
      "\n\nSPRACHE: Gib die Antwort ausschließlich auf Deutsch aus. Behalte das geforderte JSON-Format exakt bei und liefere nur valides JSON ohne zusätzlichen Fließtext." +
      "\n\nORTHOGRAPHIE / ZEICHENSATZ: JSON-Strings sind UTF-8 — Umlaute (ä, ö, ü) und das Eszett (ß) in deutschem Fließtext sind erlaubt und erwünscht. Verwende diese Zeichen direkt; ersetze Umlaute nicht durch ae, oe oder ue (z. B. „Frühphasen“, „Geschäftsmodelle“, „branchenübergreifend“). Escaping betrifft nur Anführungszeichen innerhalb von Strings, nicht Umlaute.";
  } else {
    rendered +=
      "\n\nLANGUAGE: Respond only in English. Keep the required JSON format exactly and return valid JSON only, without additional prose.";
  }
  return {
    template,
    rendered,
  };
}
