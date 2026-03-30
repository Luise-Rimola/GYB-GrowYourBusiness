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
    phase: "Ideen- und Konzeptphase",
    workflowKeys: ["WF_VALUE_PROPOSITION", "WF_COMPETITOR_ANALYSIS", "WF_SWOT"],
    fb2WorkflowKeys: [
      "WF_VALUE_PROPOSITION",
      "WF_COMPETITOR_ANALYSIS",
      "WF_SWOT",
      "WF_TREND_ANALYSIS",
    ],
    description:
      "Wir befinden uns in der Ideen- und Konzeptphase. Diese Phase ist wichtig, weil hier die Grundlage für Ihr Angebot und Ihre Ausrichtung entsteht.",
    important: [
      "Ein klares Problem und eine passende Lösung",
      "Eine verständliche Erklärung, wofür Ihr Angebot steht",
      "Ein klarer Blick auf Zielgruppe und Wettbewerb",
    ],
    fb3Description:
      "Bewerte die Ergebnisse der Konzept-Workflows (Dokumente, Argumentation, Nachvollziehbarkeit) als Nachher-Messung gegenüber FB2.",
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
      "Wir befinden uns in der Prüfphase. Diese Phase ist wichtig, weil wir testen, ob Ihre Annahmen in der Praxis tragen.",
    important: [
      "Klare Fragen, die Sie mit Daten beantworten können",
      "Prüfung von Kundennutzen und Machbarkeit",
      "Entscheidungen auf Basis von Ergebnissen statt Bauchgefühl",
    ],
    fb3Description:
      "Bewerte die Resultate der Validierungs-Workflows danach, wie stark sie Unsicherheit reduzieren und Entscheidungssicherheit erhöhen.",
  },
  marketing: {
    phase: "Gründungs- / Launchphase",
    workflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY"],
    fb2WorkflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY"],
    description:
      "Wir befinden uns in der Gründungs- und Startphase. Diese Phase ist wichtig, weil der Marktstart konkret vorbereitet wird.",
    important: [
      "Klar benennen, wen Sie erreichen wollen",
      "Passende Kanäle und klare Botschaften wählen",
      "Einfache, messbare Marketingziele festlegen",
    ],
    fb3Description:
      "Bewerte die erzeugten Launch-Ergebnisse hinsichtlich Umsetzbarkeit, Klarheit und Relevanz für den Markteintritt.",
  },
  wachstum_expansion: {
    phase: "Wachstumsphase",
    workflowKeys: ["WF_SCALING_STRATEGY", "WF_NEXT_BEST_ACTIONS"],
    fb2WorkflowKeys: ["WF_SCALING_STRATEGY", "WF_NEXT_BEST_ACTIONS"],
    description:
      "Wir befinden uns in der Wachstumsphase. Diese Phase ist wichtig, weil jetzt klare Prioritäten und umsetzbare nächste Schritte gebraucht werden.",
    important: [
      "Die wichtigsten Wachstumsziele zuerst angehen",
      "Ressourcen und Risiken realistisch einschätzen",
      "Konkrete nächste Schritte festlegen",
    ],
    fb3Description:
      "Bewerte die Outputs zu Skalierung und Priorisierung auf Wirksamkeit, Transparenz und direkte Handlungsfähigkeit.",
  },
  investition_strategie: {
    phase: "Reifephase: Investition und Strategie",
    workflowKeys: ["WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    fb2WorkflowKeys: ["WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    description:
      "Wir befinden uns in der Reifephase für Investition und Strategie. Diese Phase ist wichtig, weil größere Entscheidungen finanziell abgesichert sein müssen.",
    important: [
      "Investitionen klar begründen",
      "Kosten, Nutzen und Auswirkungen verständlich darstellen",
      "Risiken und Alternativen offen benennen",
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
      "You are in the ideation and concept phase. This phase is important because it builds the foundation for positioning and strategic decisions.",
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
      "You are in the validation phase. This phase is important because assumptions are tested and uncertainty is reduced.",
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
      "You are in the founding and launch phase. This phase is important because market entry, channels, and messaging are defined.",
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
      "You are in the growth phase. This phase is important because priorities, scaling, and operations are aligned.",
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
      "You are in the maturity phase for investment and strategy. This phase is important because financial viability, risks, and alternatives are assessed.",
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
