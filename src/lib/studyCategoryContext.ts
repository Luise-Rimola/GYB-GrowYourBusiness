import type { Locale } from "@/lib/i18n";

export type StudyCategoryKey =
  | "markt_geschaeftsmodell"
  | "produktstrategie"
  | "launch_marketing_investition"
  | "wachstum_expansion"
  | "technologie_digitalisierung"
  | "reifephase"
  | "erneuerung_exit";

export const VALID_STUDY_CATEGORIES: StudyCategoryKey[] = [
  "markt_geschaeftsmodell",
  "produktstrategie",
  "launch_marketing_investition",
  "wachstum_expansion",
  "technologie_digitalisierung",
  "reifephase",
  "erneuerung_exit",
];

export const STUDY_CATEGORY_LABELS: Record<StudyCategoryKey, string> = {
  markt_geschaeftsmodell: "Markt & Geschäftsmodell",
  produktstrategie: "Produktstrategie",
  launch_marketing_investition: "Marketing & Investition / Strategie",
  wachstum_expansion: "Wachstum & Expansion",
  technologie_digitalisierung: "Technologie & Digitalisierung",
  reifephase: "Strategiephase",
  erneuerung_exit: "Strategische Optionen / Exit / Transformation",
};

export const STUDY_CATEGORY_LABELS_EN: Record<StudyCategoryKey, string> = {
  markt_geschaeftsmodell: "Market & Business Model",
  produktstrategie: "Product Strategy",
  launch_marketing_investition: "Marketing & Investment / Strategy",
  wachstum_expansion: "Growth & Expansion",
  technologie_digitalisierung: "Technology & Digitalization",
  reifephase: "Maturity",
  erneuerung_exit: "Renewal / Exit / Transformation",
};

export function getStudyCategoryLabels(locale: Locale): Record<StudyCategoryKey, string> {
  return locale === "de" ? STUDY_CATEGORY_LABELS : STUDY_CATEGORY_LABELS_EN;
}

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

const STUDY_CATEGORY_CONTEXT_DE: Record<StudyCategoryKey, StudyCategoryLocaleBlock> = {
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
  launch_marketing_investition: {
    phase: "Gründungs- / Launchphase",
    workflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY", "WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    fb2WorkflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY", "WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    description:
      "Wir befinden uns in der Gründungs- und Launchphase. Diese Phase ist wichtig, weil Markteintritt, Vermarktung und investitionsrelevante Entscheidungen zusammen vorbereitet werden.",
    important: [
      "Klar benennen, wen Sie erreichen wollen",
      "Passende Kanäle und klare Botschaften wählen",
      "Investitionen, Finanzbedarf und Risiken nachvollziehbar machen",
      "Einfache, messbare Ziele für Markteintritt und Wachstum festlegen",
    ],
    fb3Description:
      "Bewerte die erzeugten Launch-Ergebnisse hinsichtlich Umsetzbarkeit, Klarheit und Relevanz für Markteintritt sowie Investitions-/Strategieentscheidungen.",
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie erarbeiten Go-to-Market, Marketingstrategie sowie Investitions-/Finanzierungsentscheidungen ohne KI — auf Basis interner Unterlagen, Benchmarks, Kanaltests, Budgetierung, KPI-Planung und Abstimmungen im Team.\n\n" +
      "Denken Sie an den manuellen Aufwand: Zielsegmente und Botschaften formulieren; Kanäle und Maßnahmen vergleichen; Budget, Zeitplan und Kapitalbedarf schätzen; Liquidität, Break-even und Risiken transparent machen; Alternativen begründen; Dokumentation für Freigaben konsistent halten.\n\n" +
      "Bewerten Sie, wie belastend Koordination, Unsicherheit und Dokumentationsaufwand ohne strukturierte KI-Unterstützung wären — bevor Sie die KI-gestützten Schritte in dieser Phase nutzen.",
  },
  wachstum_expansion: {
    phase: "Wachstumsphase",
    workflowKeys: ["WF_SCALING_STRATEGY", "WF_GROWTH_MARGIN_OPTIMIZATION", "WF_GROWTH_OFFER_AUDIENCE_FUNNEL", "WF_GROWTH_PAID_ADS", "WF_GROWTH_SEO", "WF_GROWTH_RETENTION_CONTENT", "WF_GROWTH_EXECUTION_PLAN", "WF_NEXT_BEST_ACTIONS"],
    fb2WorkflowKeys: ["WF_SCALING_STRATEGY", "WF_GROWTH_MARGIN_OPTIMIZATION", "WF_GROWTH_OFFER_AUDIENCE_FUNNEL", "WF_GROWTH_PAID_ADS", "WF_GROWTH_SEO", "WF_GROWTH_RETENTION_CONTENT", "WF_GROWTH_EXECUTION_PLAN", "WF_NEXT_BEST_ACTIONS"],
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
  technologie_digitalisierung: {
    phase: "Technologie & Digitalisierung",
    workflowKeys: ["WF_TECH_DIGITALIZATION", "WF_AUTOMATION_ROI", "WF_PHYSICAL_AUTOMATION", "WF_APP_DEVELOPMENT"],
    fb2WorkflowKeys: ["WF_TECH_DIGITALIZATION", "WF_AUTOMATION_ROI", "WF_PHYSICAL_AUTOMATION", "WF_APP_DEVELOPMENT"],
    description:
      "Wir befinden uns in der Phase Technologie & Digitalisierung. Diese Phase ist wichtig, weil hier technische Hebel, Automatisierung und Implementierungsoptionen strukturiert bewertet werden.",
    important: [
      "Technische Optionen vergleichbar machen",
      "ROI und Umsetzbarkeit transparent bewerten",
      "Schrittweise Einführung mit klaren Prioritäten planen",
    ],
    fb3Description:
      "Bewerte die Ergebnisse zu Technologie- und Automatisierungsoptionen hinsichtlich Klarheit, Priorisierung und Realisierbarkeit.",
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie müssten Digitalisierungs- und Automatisierungsoptionen ohne KI-Unterstützung bewerten — anhand Tool-Recherche, Anbieterangeboten, manuellen Kosten-Nutzen-Rechnungen, technischen Abhängigkeiten und Teamabstimmungen.\n\n" +
      "Typische Arbeit ohne Tool: Ist-Aufnahme von Prozessen; Automatisierungspotenziale identifizieren; Integrationsrisiken bewerten; Investitionskosten, laufende Kosten und ROI grob rechnen; Prioritäten mit begrenzten Ressourcen abstimmen; Implementierungsplan und Risiken dokumentieren.\n\n" +
      "Bewerten Sie, wie aufwendig und unsicher dieser Prozess ohne KI-Unterstützung wäre — bevor Sie die KI-gestützten Prozesse nutzen.",
  },
  reifephase: {
    phase: "Strategiephase / Erneuerung",
    workflowKeys: [
      "WF_DIAGNOSTIC",
      "WF_GROWTH_MARGIN_OPTIMIZATION",
      "WF_SCALING_STRATEGY",
      "WF_PROCESS_OPTIMIZATION",
      "WF_TECH_DIGITALIZATION",
      "WF_AUTOMATION_ROI",
      "WF_PHYSICAL_AUTOMATION",
      "WF_APP_DEVELOPMENT",
      "WF_PORTFOLIO_MANAGEMENT",
      "WF_SUBSIDY_RESEARCH",
      "WF_STRATEGIC_OPTIONS",
    ],
    fb2WorkflowKeys: [
      "WF_DIAGNOSTIC",
      "WF_GROWTH_MARGIN_OPTIMIZATION",
      "WF_SCALING_STRATEGY",
      "WF_PROCESS_OPTIMIZATION",
      "WF_TECH_DIGITALIZATION",
      "WF_AUTOMATION_ROI",
      "WF_PHYSICAL_AUTOMATION",
      "WF_APP_DEVELOPMENT",
      "WF_PORTFOLIO_MANAGEMENT",
      "WF_SUBSIDY_RESEARCH",
      "WF_STRATEGIC_OPTIONS",
    ],
    description:
      "Wir befinden uns in der Strategiephase. Diese Phase ist wichtig, weil Effizienz, Portfolioentscheidungen, Foerderhebel und strategische Erneuerung systematisch vorbereitet werden.",
    important: [
      "Operative Effizienz und Profitabilität erhöhen",
      "Portfolio- und Markenentscheidungen nachvollziehbar treffen",
      "Strategische Optionen inkl. Risiken transparent gegenüberstellen",
    ],
    fb3Description:
      "Bewerte die Outputs der Strategiephase in Bezug auf Entscheidungsqualität, strategische Belastbarkeit und Umsetzbarkeit.",
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie analysieren Optimierungs- und Erneuerungsoptionen ohne KI-Unterstützung — mit manueller Datenaufbereitung, Workshops, Szenariovergleich, Portfolioanalysen und Entscheidungsdokumenten.\n\n" +
      "Typische Schritte: Ineffizienzen und Kostentreiber identifizieren; Produkt-/Leistungsportfolio bewerten; strategische Alternativen inklusive Exit-/Transformationspfaden vergleichen; Risiken und Abhängigkeiten dokumentieren; priorisierte Maßnahmen mit Zeit- und Ressourcenplan festhalten.\n\n" +
      "Bewerten Sie, wie komplex und belastend dieser Prozess ohne KI-Unterstützung wäre — bevor Sie die KI-gestützten Prozesse einsetzen.",
  },
  erneuerung_exit: {
    phase: "Strategische Optionen / Exit / Transformation",
    workflowKeys: ["WF_STRATEGIC_OPTIONS"],
    fb2WorkflowKeys: ["WF_STRATEGIC_OPTIONS"],
    description:
      "Wir befinden uns in der Phase Strategische Optionen / Exit / Transformation. Diese Phase ist wichtig, weil grundlegende strategische Weichenstellungen vorbereitet werden.",
    important: [
      "Strategische Optionen inkl. Unternehmenswert, Exit-Kanälen und Expansion strukturiert vergleichen",
      "Risiken und Abhängigkeiten offen bewerten",
      "Klare Entscheidungslogik für Transformation oder Exit dokumentieren",
    ],
    fb3Description:
      "Bewerte die Ergebnisse dieser Phase in Bezug auf Nachvollziehbarkeit, strategische Tragfähigkeit und Entscheidungsreife.",
    fb2WithoutToolScenario:
      "Stellen Sie sich vor, Sie müssten eine Erneuerungs-, Transformations- oder Exit-Entscheidung ohne KI-Unterstützung vorbereiten — mit manueller Markt-/Finanzanalyse, Szenariovergleich, Stakeholder-Abstimmungen und schriftlichen Entscheidungsvorlagen.\n\n" +
      "Typische Arbeit ohne Tool: Optionen strukturieren (z. B. Neuausrichtung, Partnerschaften, Verkauf, Nachfolge); Chancen/Risiken je Option bewerten; finanzielle und organisatorische Folgen abschätzen; Annahmen und Unsicherheiten transparent machen; Entscheidungsunterlagen für Management/Investoren nachvollziehbar aufbereiten.\n\n" +
      "Bewerten Sie, wie komplex, zeitintensiv und unsicher dieser Prozess ohne KI-Unterstützung wäre — bevor Sie die KI-gestützten Prozesse nutzen.",
  },
};

const STUDY_CATEGORY_CONTEXT_EN: Record<StudyCategoryKey, StudyCategoryLocaleBlock> = {
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
    fb2WithoutToolScenario:
      "Imagine you validate idea, USP, feasibility, and customer fit without AI — using workshops, surveys, prototypes, expert feedback, research, and manual analysis in spreadsheets and documents.\n\n" +
      "For a realistic rating, think about: which hypotheses must be tested; what data and samples are missing; how you coordinate stakeholders and schedules; where uncertainty, legal, or technical risks sit; how you keep findings traceable for later decisions.\n\n" +
      "Your answers should reflect how strenuous, slow, or uncertain such a validation process would feel without AI support — before you use the assisted processes.",
  },
  launch_marketing_investition: {
    phase: "Founding / launch phase",
    workflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY", "WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    fb2WorkflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY", "WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"],
    description:
      "You are in the founding/launch phase. This phase is important because market entry, marketing execution, and investment/strategy decisions are prepared together.",
    important: [
      "Name target segments clearly",
      "Justify channels and messages",
      "Make investment logic and financial impact transparent",
      "Set measurable launch and growth goals",
    ],
    fb3Description:
      "Rate launch outputs for feasibility, clarity, and relevance for both market entry and investment/strategy decisions.",
    fb2WithoutToolScenario:
      "Imagine you prepare go-to-market, marketing strategy, and investment/financial decisions without AI support — using internal material, benchmarks, channel tests, budgets, KPI planning, and cross-team alignment.\n\n" +
      "Consider the manual effort: define segments and messaging; compare channels and tactics; estimate budget, timeline, liquidity, and capital needs; evaluate break-even and risks; justify alternatives; keep decision documents consistent for execution and approvals.\n\n" +
      "Rate how heavy coordination, uncertainty, and documentation burden would be without structured AI assistance — before you run the AI-supported steps in this phase.",
  },
  wachstum_expansion: {
    phase: "Growth phase",
    workflowKeys: ["WF_SCALING_STRATEGY", "WF_GROWTH_MARGIN_OPTIMIZATION", "WF_GROWTH_OFFER_AUDIENCE_FUNNEL", "WF_GROWTH_PAID_ADS", "WF_GROWTH_SEO", "WF_GROWTH_RETENTION_CONTENT", "WF_GROWTH_EXECUTION_PLAN", "WF_NEXT_BEST_ACTIONS"],
    fb2WorkflowKeys: ["WF_SCALING_STRATEGY", "WF_GROWTH_MARGIN_OPTIMIZATION", "WF_GROWTH_OFFER_AUDIENCE_FUNNEL", "WF_GROWTH_PAID_ADS", "WF_GROWTH_SEO", "WF_GROWTH_RETENTION_CONTENT", "WF_GROWTH_EXECUTION_PLAN", "WF_NEXT_BEST_ACTIONS"],
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
  technologie_digitalisierung: {
    phase: "Technology & digitalization",
    workflowKeys: ["WF_TECH_DIGITALIZATION", "WF_AUTOMATION_ROI", "WF_PHYSICAL_AUTOMATION", "WF_APP_DEVELOPMENT"],
    fb2WorkflowKeys: ["WF_TECH_DIGITALIZATION", "WF_AUTOMATION_ROI", "WF_PHYSICAL_AUTOMATION", "WF_APP_DEVELOPMENT"],
    description:
      "You are in the technology and digitalization phase. This phase is important because automation options and technical priorities are evaluated structurally.",
    important: [
      "Make technical options comparable",
      "Evaluate ROI and feasibility transparently",
      "Plan staged rollout with clear priorities",
    ],
    fb3Description:
      "Rate technology and automation outputs by clarity, prioritization quality, and implementation feasibility.",
    fb2WithoutToolScenario:
      "Imagine you evaluate digitalization and automation options without AI support — based on vendor research, manual cost-benefit sheets, technical constraints, and cross-team alignment.\n\n" +
      "Typical work without support: map current processes; identify automation potential; assess integration risks; estimate investment and operating costs plus ROI; prioritize under resource constraints; document implementation plan and dependencies.\n\n" +
      "Rate how heavy and uncertain this process would be without AI support — before using the AI-assisted workflows.",
  },
  reifephase: {
    phase: "Maturity / renewal",
    workflowKeys: [
      "WF_DIAGNOSTIC",
      "WF_GROWTH_MARGIN_OPTIMIZATION",
      "WF_SCALING_STRATEGY",
      "WF_PROCESS_OPTIMIZATION",
      "WF_TECH_DIGITALIZATION",
      "WF_AUTOMATION_ROI",
      "WF_PHYSICAL_AUTOMATION",
      "WF_APP_DEVELOPMENT",
      "WF_PORTFOLIO_MANAGEMENT",
      "WF_SUBSIDY_RESEARCH",
      "WF_STRATEGIC_OPTIONS",
    ],
    fb2WorkflowKeys: [
      "WF_DIAGNOSTIC",
      "WF_GROWTH_MARGIN_OPTIMIZATION",
      "WF_SCALING_STRATEGY",
      "WF_PROCESS_OPTIMIZATION",
      "WF_TECH_DIGITALIZATION",
      "WF_AUTOMATION_ROI",
      "WF_PHYSICAL_AUTOMATION",
      "WF_APP_DEVELOPMENT",
      "WF_PORTFOLIO_MANAGEMENT",
      "WF_SUBSIDY_RESEARCH",
      "WF_STRATEGIC_OPTIONS",
    ],
    description:
      "You are in the optimization phase. This phase is important because efficiency, portfolio decisions, subsidy opportunities, and strategic renewal are prepared systematically.",
    important: [
      "Increase efficiency and profitability",
      "Make portfolio decisions traceable",
      "Compare strategic options including risks transparently",
    ],
    fb3Description:
      "Rate optimization-phase outputs by decision quality, strategic robustness, and practical applicability.",
    fb2WithoutToolScenario:
      "Imagine you evaluate optimization and renewal options without AI support — using manual data preparation, workshops, scenario comparisons, portfolio analyses, and decision documents.\n\n" +
      "Typical steps: identify inefficiencies and cost drivers; evaluate product/service portfolio; compare strategic alternatives including transformation or exit paths; document risks and dependencies; define prioritized actions with timeline and ownership.\n\n" +
      "Rate how complex and cognitively demanding this process would be without AI support — before using the AI-assisted workflows.",
  },
  erneuerung_exit: {
    phase: "Renewal / exit / transformation",
    workflowKeys: ["WF_STRATEGIC_OPTIONS"],
    fb2WorkflowKeys: ["WF_STRATEGIC_OPTIONS"],
    description:
      "You are in the strategic options / exit / transformation phase. This phase is important because foundational strategic directions are prepared.",
    important: [
      "Compare strategic options structurally",
      "Assess risks and dependencies transparently",
      "Document clear decision logic for transformation or exit",
    ],
    fb3Description:
      "Rate the outputs for traceability, strategic robustness, and readiness for high-stakes decisions.",
    fb2WithoutToolScenario:
      "Imagine you must prepare a renewal, transformation, or exit decision without AI support — using manual market/financial analysis, scenario comparison, stakeholder alignment, and written decision memos.\n\n" +
      "Typical work without support: structure alternatives (e.g. repositioning, partnerships, sale, succession); evaluate opportunities/risks per option; estimate financial and organizational impact; make assumptions and uncertainty explicit; prepare materials that leadership/investors can review transparently.\n\n" +
      "Rate how complex, time-consuming, and uncertain this process would be without AI support — before using the AI-assisted workflows.",
  },
};

export function getStudyCategoryContext(locale: Locale): Record<StudyCategoryKey, StudyCategoryLocaleBlock> {
  return locale === "de" ? STUDY_CATEGORY_CONTEXT_DE : STUDY_CATEGORY_CONTEXT_EN;
}

/** @deprecated Nutze getStudyCategoryContext(locale) für die richtige Sprache. */
export const STUDY_CATEGORY_CONTEXT = STUDY_CATEGORY_CONTEXT_DE;
