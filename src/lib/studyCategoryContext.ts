import type { ScenarioCategory } from "@/lib/scenarios";
import type { Locale } from "@/lib/i18n";

export const VALID_STUDY_CATEGORIES: ScenarioCategory[] = [
  "markt_geschaeftsmodell",
  "produktstrategie",
  "marketing",
  "wachstum_expansion",
  "investition_strategie",
];

/** Ein Bereich: Info-Seite, FB2-Kontextbox, FB3-Beschreibung. */
export type StudyCategoryLocaleBlock = {
  phase: string;
  /** Kurze Liste für Info-Seite */
  workflowKeys: string[];
  /** Erweiterte Liste für FB2-Kontext */
  fb2WorkflowKeys: string[];
  /** Info-Seite: Einleitung */
  description: string;
  /** Info-Seite: Stichpunkte */
  important: string[];
  /** FB3: Fließtext unter den Workflows */
  fb3Description: string;
};

const STUDY_CATEGORY_CONTEXT_DE: Record<ScenarioCategory, StudyCategoryLocaleBlock> = {
  markt_geschaeftsmodell: {
    phase: "Ideations- / Konzeptphase",
    workflowKeys: ["WF_VALUE_PROPOSITION", "WF_COMPETITOR_ANALYSIS", "WF_SWOT"],
    fb2WorkflowKeys: [
      "WF_VALUE_PROPOSITION",
      "WF_COMPETITOR_ANALYSIS",
      "WF_SWOT",
      "WF_TREND_ANALYSIS",
    ],
    description:
      "Hier bewertest du die Ausgangsqualität deiner Ideen- und Konzeptarbeit vor den Runs.",
    important: [
      "Klarer Problem-Solution-Fit",
      "Nachvollziehbare Positionierung",
      "Begründung für Zielgruppe und Wettbewerb",
    ],
    fb3Description:
      "Bewerte die Ergebnisse der Konzept-Workflows (Artefakte, Argumentation, Nachvollziehbarkeit) als Nachher-Messung gegenüber FB2.",
  },
  produktstrategie: {
    phase: "Validierungsphase",
    workflowKeys: ["WF_IDEA_USP_VALIDATION", "WF_FEASIBILITY_VALIDATION", "WF_CUSTOMER_VALIDATION"],
    fb2WorkflowKeys: [
      "WF_IDEA_USP_VALIDATION",
      "WF_FEASIBILITY_VALIDATION",
      "WF_PATENT_CHECK",
      "WF_LEGAL_FOUNDATION",
      "WF_CUSTOMER_VALIDATION",
    ],
    description:
      "Hier bewertest du, wie belastbar deine Produkt-/Strategieannahmen vor der Validierung sind.",
    important: [
      "Testbare Hypothesen",
      "Klare Annahmen zu Kundennutzen und Machbarkeit",
      "Fokus auf evidenzbasierte Entscheidungen",
    ],
    fb3Description:
      "Bewerte die Resultate der Validierungs-Workflows danach, wie stark sie Unsicherheit reduzieren und Entscheidungssicherheit erhöhen.",
  },
  marketing: {
    phase: "Gründungs- / Launchphase",
    workflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY"],
    fb2WorkflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY"],
    description:
      "Hier bewertest du die Entscheidungsqualität für Markteintritt und Kanalstrategie vor dem Run.",
    important: [
      "Zielkundensegmente klar benennen",
      "Kanäle und Botschaften begründen",
      "Messbare Marketingziele festlegen",
    ],
    fb3Description:
      "Bewerte die erzeugten Launch-Ergebnisse hinsichtlich Umsetzbarkeit, Klarheit und Relevanz für den Markteintritt.",
  },
  wachstum_expansion: {
    phase: "Wachstumsphase",
    workflowKeys: ["WF_SCALING_STRATEGY", "WF_NEXT_BEST_ACTIONS"],
    fb2WorkflowKeys: ["WF_SCALING_STRATEGY", "WF_NEXT_BEST_ACTIONS"],
    description:
      "Hier bewertest du die Ausgangslage für Skalierung, Priorisierung und operative Steuerung.",
    important: [
      "Top-Prioritäten für Wachstum klar definieren",
      "Kapazitäten und Risiken realistisch einschätzen",
      "Nächste Schritte operational planen",
    ],
    fb3Description:
      "Bewerte die Outputs zu Skalierung und Priorisierung auf Wirksamkeit, Transparenz und direkte Handlungsfähigkeit.",
  },
  investition_strategie: {
    phase: "Reifephase / Investition & Strategie",
    workflowKeys: ["WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    fb2WorkflowKeys: ["WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    description:
      "Hier bewertest du die strategische und finanzielle Entscheidungsreife vor den Runs.",
    important: [
      "Investitionslogik transparent begründen",
      "Finanzielle Auswirkungen plausibel machen",
      "Risiken und Alternativen klar benennen",
    ],
    fb3Description:
      "Bewerte die Ergebnisse für Investitions-/Strategieentscheidungen nach Belastbarkeit, Risikoabbildung und Entscheidungslogik.",
  },
};

const STUDY_CATEGORY_CONTEXT_EN: Record<ScenarioCategory, StudyCategoryLocaleBlock> = {
  markt_geschaeftsmodell: {
    phase: "Ideation / concept phase",
    workflowKeys: ["WF_VALUE_PROPOSITION", "WF_COMPETITOR_ANALYSIS", "WF_SWOT"],
    fb2WorkflowKeys: [
      "WF_VALUE_PROPOSITION",
      "WF_COMPETITOR_ANALYSIS",
      "WF_SWOT",
      "WF_TREND_ANALYSIS",
    ],
    description:
      "Here you assess the baseline quality of your ideation and concept work before the runs.",
    important: [
      "Clear problem–solution fit",
      "Traceable positioning",
      "Rationale for target group and competition",
    ],
    fb3Description:
      "Rate the outcomes of the concept workflows (artifacts, reasoning, traceability) as an after measure compared to questionnaire 2.",
  },
  produktstrategie: {
    phase: "Validation phase",
    workflowKeys: ["WF_IDEA_USP_VALIDATION", "WF_FEASIBILITY_VALIDATION", "WF_CUSTOMER_VALIDATION"],
    fb2WorkflowKeys: [
      "WF_IDEA_USP_VALIDATION",
      "WF_FEASIBILITY_VALIDATION",
      "WF_PATENT_CHECK",
      "WF_LEGAL_FOUNDATION",
      "WF_CUSTOMER_VALIDATION",
    ],
    description:
      "Here you assess how robust your product/strategy assumptions are before validation.",
    important: [
      "Testable hypotheses",
      "Clear assumptions on customer value and feasibility",
      "Focus on evidence-based decisions",
    ],
    fb3Description:
      "Rate validation workflow results by how much they reduce uncertainty and increase decision confidence.",
  },
  marketing: {
    phase: "Founding / launch phase",
    workflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY"],
    fb2WorkflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY"],
    description:
      "Here you assess decision quality for market entry and channel strategy before the run.",
    important: [
      "Name target segments clearly",
      "Justify channels and messages",
      "Set measurable marketing goals",
    ],
    fb3Description:
      "Rate launch outputs for feasibility, clarity, and relevance for market entry.",
  },
  wachstum_expansion: {
    phase: "Growth phase",
    workflowKeys: ["WF_SCALING_STRATEGY", "WF_NEXT_BEST_ACTIONS"],
    fb2WorkflowKeys: ["WF_SCALING_STRATEGY", "WF_NEXT_BEST_ACTIONS"],
    description:
      "Here you assess the starting point for scaling, prioritisation, and operational steering.",
    important: [
      "Define top growth priorities clearly",
      "Assess capacity and risks realistically",
      "Plan next steps operationally",
    ],
    fb3Description:
      "Rate scaling and prioritisation outputs for impact, transparency, and actionable next steps.",
  },
  investition_strategie: {
    phase: "Maturity / investment & strategy",
    workflowKeys: ["WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    fb2WorkflowKeys: ["WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    description:
      "Here you assess strategic and financial decision maturity before the runs.",
    important: [
      "Make investment logic transparent",
      "Make financial effects plausible",
      "Name risks and alternatives clearly",
    ],
    fb3Description:
      "Rate outputs for investment/strategy decisions by robustness, risk coverage, and decision logic.",
  },
};

export function getStudyCategoryContext(locale: Locale): Record<ScenarioCategory, StudyCategoryLocaleBlock> {
  return locale === "de" ? STUDY_CATEGORY_CONTEXT_DE : STUDY_CATEGORY_CONTEXT_EN;
}

/** @deprecated Nutze getStudyCategoryContext(locale) für die richtige Sprache. */
export const STUDY_CATEGORY_CONTEXT = STUDY_CATEGORY_CONTEXT_DE;
