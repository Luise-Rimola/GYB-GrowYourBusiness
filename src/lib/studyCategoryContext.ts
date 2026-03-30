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
  /**
   * FB2 (ohne KI-Tool): Konkrete Vorstellung manueller Arbeit und Analyse,
   * damit die Skalen „Prozess ohne KI“ fair bewertet werden können.
   */
  fb2WithoutToolScenario: string;
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
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie müssten Wertversprechen, Wettbewerbsanalyse und SWOT für Ihr Vorhaben ohne KI-Unterstützung erarbeiten — nur mit Tabellen, Textdokumenten, Internetrecherche, Branchenberichten und ggf. Gesprächen mit Kolleginnen, Kollegen oder Kundinnen.\n\n" +
      "Damit Sie den Prozess fair beurteilen können, fokussieren Sie die typische Arbeit: Zielgruppe und Kernproblem schärfen; Angebote, Positionierung und Preise von Wettbewerbern einzeln recherchieren und vergleichen; Markt- und Trendinformationen sichten und einordnen; Stärken und Schwächen Ihres Unternehmens mit Belegen herausarbeiten; Chancen und Risiken aus Markt- und Wettbewerbssicht ableiten; Annahmen, Datenlücken und offene Punkte dokumentieren.\n\n" +
      "Genau diese mentale und zeitliche Belastung — Informationen sammeln, strukturieren, abgleichen, begründen und dokumentieren — soll Ihre Bewertung in diesem Fragebogen widerspiegeln, bevor Sie die KI-gestützten Prozesse nutzen.",
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
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie prüfen Idee, Alleinstellungsmerkmal (USP), Machbarkeit und Kundenpassung ohne KI — mit Workshops, Umfragen, Prototypen, Expertenfeedback, Recherche und manueller Auswertung in Tabellen und Dokumenten.\n\n" +
      "Für eine realistische Bewertung denken Sie an: Welche Hypothesen müssen getestet werden? Welche Daten und Stichproben fehlen? Wie koordinieren Sie Stakeholder und Termine? Wo liegen Unsicherheiten, rechtliche oder technische Risiken? Wie halten Sie Erkenntnisse nachvollziehbar fest, damit spätere Entscheidungen begründbar sind?\n\n" +
      "Ihre Antworten sollen widerspiegeln, wie anstrengend, langsam oder unsicher sich ein solcher Validierungsprozess ohne KI-Unterstützung anfühlen würde — bevor Sie die unterstützten Prozesse nutzen.",
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
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie priorisieren Wachstum und die nächsten Schritte ohne KI — mit Kennzahlen aus Controlling oder CRM, Kapazitätsabschätzungen, Risikolisten, Szenarioüberlegungen und Abstimmungen zwischen Bereichen.\n\n" +
      "Typische Analyse ohne Tool: Engpässe und Engpassursachen identifizieren; Wachstumshebel gegenüber Risiken abwägen; Investitionen und Personalbedarf grob quantifizieren; Alternativen und Reihenfolge der Maßnahmen begründen; Entscheidungsvorlagen manuell erstellen.\n\n" +
      "Ihre Skalen sollen erfassen, wie belastend und unsicher sich ein solcher Prozess ohne KI-Unterstützung darstellt — bevor Sie die unterstützten Abläufe nutzen.",
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
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie bereiten strategische und finanzielle Entscheidungen vor ohne KI — mit Excel, Jahresabschlüssen, Planungsannahmen, Investitionsrechnungen, Szenarien (Basis, pessimistisch, optimistisch) und schriftlichen Argumentationslinien für Geschäftsführung oder Investoren.\n\n" +
      "Konkret: Liquidität und Kapitalbedarf nachvollziehen; Sensitivitäten und Break-even durchrechnen; Risiken, Alternativen und Mitigationsmaßnahmen formulieren; Annahmen transparent machen und belegen; Dokumente so aufbereiten, dass Prüfende Entscheidungen nachvollziehen können.\n\n" +
      "Bewerten Sie, wie zeitintensiv, fehleranfällig und kognitiv belastend ein solcher Prozess ohne KI-Unterstützung wäre — bevor Sie die KI-gestützten Prozesse einsetzen.",
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
    fb2WithoutToolScenario:
      "Imagine you must produce value proposition, competitor analysis, and SWOT for your initiative without AI support — only spreadsheets, documents, web research, industry reports, and conversations with colleagues or customers.\n\n" +
      "To judge the process fairly, focus on the typical work: sharpen target group and core problem; research and compare competitors’ offers, positioning, and pricing; scan and interpret market/trend information; substantiate strengths and weaknesses of your company; derive opportunities and threats from market/competition; document assumptions, data gaps, and open questions.\n\n" +
      "That cognitive and time burden — collect, structure, reconcile, justify, document — is what this questionnaire should reflect before you use the AI-assisted processes.",
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
    fb2WithoutToolScenario:
      "Imagine you build go-to-market and marketing strategy without AI — from internal materials, benchmarks, channel tests, budgeting, KPIs, and team alignment (e.g. workshops or written plans).\n\n" +
      "Consider the manual effort: describe segments; craft messages and offers; compare channels and tactics; estimate budget and timeline; define KPIs and success criteria; name risks and dependencies; keep documentation consistent for execution and approvals.\n\n" +
      "Rate how heavy coordination and uncertainty would be without structured AI assistance — before you run the AI-supported steps in this phase.",
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
    fb2WithoutToolScenario:
      "Imagine you prioritise growth and next actions without AI — using KPIs from finance or CRM, capacity estimates, risk lists, scenario thinking, and alignment across functions.\n\n" +
      "Typical analysis without a tool: find bottlenecks and causes; weigh growth levers against risks; roughly quantify investment and staffing needs; justify sequencing and alternatives; produce decision templates manually.\n\n" +
      "Your scales should capture how burdensome and uncertain such a process would feel without AI support — before you use the assisted flows.",
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
    fb2WithoutToolScenario:
      "Imagine you prepare strategic and financial decisions without AI — using spreadsheets, financial statements, planning assumptions, investment calculations, scenarios (base/downside/upside), and written arguments for leadership or investors.\n\n" +
      "Concretely: trace liquidity and funding needs; run sensitivities and break-even; spell out risks, alternatives, and mitigations; make assumptions explicit and evidenced; prepare materials so reviewers can follow the decision.\n\n" +
      "Rate how time-consuming, error-prone, and cognitively demanding such a process would be without AI assistance — before you use the AI-supported workflows.",
  },
};

export function getStudyCategoryContext(locale: Locale): Record<ScenarioCategory, StudyCategoryLocaleBlock> {
  return locale === "de" ? STUDY_CATEGORY_CONTEXT_DE : STUDY_CATEGORY_CONTEXT_EN;
}

/** @deprecated Nutze getStudyCategoryContext(locale) für die richtige Sprache. */
export const STUDY_CATEGORY_CONTEXT = STUDY_CATEGORY_CONTEXT_DE;
