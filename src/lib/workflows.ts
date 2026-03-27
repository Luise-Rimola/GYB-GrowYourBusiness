export const WORKFLOWS = [
  {
    key: "WF_BUSINESS_FORM",
    name: "Business Form",
    description: "Manuelles Ausfüllen des Unternehmensprofils (Intake).",
    explanation: "Erklärung: Erster Schritt – manuelles Ausfüllen des Business-Formulars. Basiert auf: nichts (Start). Output: Company Profile, Intake Session (gespeichert in DB).",
  },
  {
    key: "WF_BASELINE",
    name: "Baseline",
    description: "Business model + KPI setup + gap scan.",
    explanation: "Erklärung: Grundlage für alle weiteren Workflows. Basiert auf: Company Profile (Intake). Zu Untersuchen: Geschäftsmodell, KPI-Auswahl, Lückenanalyse, Branchendaten. Output: Business-Model-Klassifikation, KPI-Set, KPI-Gap-Report, Industry Research (JSON).",
  },
  {
    key: "WF_MARKET",
    name: "Market Snapshot",
    description: "Segments, competitors, pricing, demand.",
    explanation: "Erklärung: Kompakte Marktübersicht für spätere Workflows. Basiert auf: Industry Research, Company Profile. Zu Untersuchen: Marktsegmente, Wettbewerber, Preise, Nachfrage-Treiber. Output: Liste mit segments, competitors, pricing_index, demand_drivers, risks (JSON).",
  },
  {
    key: "WF_RESEARCH",
    name: "Market & Best Practices Research",
    description: "Kaufverhalten, Angebot/Nachfrage, feasibility, best practices, failure reasons.",
    explanation: "Erklärung: Vertiefte Markt- und Branchenanalyse. Basiert auf: Market Snapshot, Industry Research, Company Profile. Zu Untersuchen: Kaufverhalten, Angebot/Nachfrage, Machbarkeit, Best Practices, Misserfolgsgründe. Output: market_research, best_practices, failure_reasons (JSON).",
  },
  {
    key: "WF_MENU_CARD",
    name: "Menu Card",
    description: "Intro + full offer catalog with components – basis for supplier list.",
    explanation: "Erklärung: Angebotskatalog für jede Branche (Food, Fashion, IT, Retail). Basiert auf: Market Snapshot, Industry Research, Company Profile. Output: menu_intro (Einführung), menu_full (vollständiges Angebot mit Komponenten pro Item – Zutaten, Materialien, Deliverables). Grundlage für Lieferantenliste.",
  },
  {
    key: "WF_SUPPLIER_LIST",
    name: "Supplier List",
    description: "Suppliers per ingredient (meat, sauces, avocado, etc.) – for cost calculation.",
    explanation: "Erklärung: Lieferantenrecherche pro Zutat. Basiert auf: Menu Card (alle Zutaten aus Gerichten), Market Snapshot, Company Profile. Zu Untersuchen: Lieferant pro Zutat (Fleisch, Saucen, Avocado, Gemüse, etc.). Output: Liste mit material, supplier, price_per_unit (JSON).",
  },
  {
    key: "WF_MENU_COST",
    name: "Warenkosten",
    description: "Cost of goods per menu item – combines menu and supplier list.",
    explanation: "Erklärung: Berechnung der Warenkosten pro Menüpunkt. Basiert auf: Menu Card (items mit components), Supplier List (material, price_per_unit). Zu Untersuchen: Zuordnung Komponente → Lieferantenpreis, Menge × Preis pro Komponente, Summe pro Gericht. Output: items mit total_cost, selling_price, margin_percent; summary mit total_warenkosten (JSON).",
  },
  {
    key: "WF_MENU_PRICING",
    name: "Menü & Preiskalkulation",
    description: "4 Schritte: Menü → Lieferanten → Warenkosten → Preiskalkulation.",
    explanation: "Erklärung: Vollständiger Prozess von Angebotskatalog bis Verkaufspreisen. Schritt 1: Menü mit Komponenten. Schritt 2: Lieferanten pro Zutat. Schritt 3: Warenkosten pro Gericht. Schritt 4: Empfohlene Verkaufspreise mit Zielmarge. Basiert auf: Market Snapshot, Company Profile. Output: menu_card, supplier_list, menu_cost, menu_preiskalkulation (JSON).",
  },
  {
    key: "WF_REAL_ESTATE",
    name: "Real Estate",
    description: "Rent, utilities (Strom, Wasser etc.) – for fixed costs.",
    explanation: "Erklärung: Immobilienoptionen für Fixkostenplanung (Miete, Nebenkosten). Basiert auf: Market Snapshot (Segmente), Industry Research, Company Profile (Standort, Branche, Angebot). Zu Untersuchen: Büros, Retail, Lager – Miete, Strom, Wasser, Nebenkosten. Output: Liste von Optionen mit type, location, price_range, suitability (JSON).",
  },
  {
    key: "WF_DIAGNOSTIC",
    name: "Diagnostics",
    description: "Root-Cause-Bäume für KPI-Lücken – Basis für Skalierung.",
    explanation: "Erklärung: Ursachenanalyse für KPI-Lücken in der Wachstumsphase. Basiert auf: Baseline (kpi_table, top_gaps, data_quality_alerts), KPI-Set, Industry Research. Zu Untersuchen: Root-Cause-Bäume für Top-Gaps. Prozesse standardisieren vor Skalierung. Output: root_cause_trees (JSON).",
  },
  {
    key: "WF_NEXT_BEST_ACTIONS",
    name: "Next Best Actions",
    description: "Top-5 decisions + 30/60/90 plan.",
    explanation: "Erklärung: Top-5-Entscheidungen und 30/60/90-Plan. Basiert auf: Market Research (feasibility, supply_demand), Best Practices, Failure Analysis, Industry Research, KPI-Set. Zu Untersuchen: Priorisierte Initiativen, Umsetzungsplan, Guardrails. Output: decision_proposals, execution_plan_30_60_90, guardrails (JSON).",
  },
  {
    key: "WF_MARKETING_STRATEGY",
    name: "Marketing Strategie",
    description: "Marketingstrategie für Wachstum – Kanäle, Zielgruppen, Budget.",
    explanation: "Erklärung: Marketingstrategie für die Wachstumsphase. Basiert auf: Baseline, Next Best Actions, Market Research, Industry Research, Company Profile. Zu Untersuchen: Marketingkanäle, Zielgruppen, Budgetverteilung, Kampagnenplanung, Messung. Output: marketing_strategy (JSON).",
  },
  {
    key: "WF_BUSINESS_PLAN",
    name: "Business Plan & Finance",
    description: "Businessplan, Marketingstrategie, 3 Finanzszenarien.",
    explanation: "Erklärung: Vollständiger Businessplan für Launch. Basiert auf: Market Snapshot, Failure Analysis, Supplier List, Real Estate, Industry Research, Company Profile. Zu Untersuchen: Executive Summary, Marktanalyse, Marketingstrategie, Finanzszenarien (3 Szenarien), Risikoanalyse. Kritisch: Cashflow Management. Output: Business Plan mit 5 Sektionen (JSON).",
  },
  {
    key: "WF_KPI_ESTIMATION",
    name: "KPI Estimation",
    description: "Estimate KPIs from business data, market analysis, strategies, and growth plans.",
    explanation: "Erklärung: KPI-Prognosen (Monat 1 und Monat 12) für alle geschäftsrelevanten KPIs. Zeigt die erwartete Entwicklung über das Jahr. Basiert auf: Company Profile, Industry Research, Market Snapshot, Market Research, Baseline, Business Plan, Financial Planning. Output: kpi_estimates mit value_month_1 und value_month_12 pro KPI.",
  },
  {
    key: "WF_DATA_COLLECTION_PLAN",
    name: "Data Collection Plan",
    description: "Fallback when data is missing.",
    explanation: "Erklärung: Plan zur Datenerhebung für fehlende KPIs. Basiert auf: KPI-Set, missing_inputs, Company Profile. Zu Untersuchen: Welche Daten fehlen, wie sie erhoben werden. Output: questions_simple, mapping_to_kpi_keys (JSON).",
  },
  {
    key: "WF_STARTUP_CONSULTING",
    name: "Funding",
    description: "Rechtsform, Funding & Gründungsoptionen.",
    explanation: "Erklärung: Rechtsform und Finanzierungsempfehlungen für Launch. Basiert auf: Company Profile (stage, industry, funding_status, legal_structure), Startup Insights, Industry Research. Zu Untersuchen: Rechtsform, Finanzierungsmodelle, Gründungsoptionen. Output: funding_recommendations, incorporation_recommendations (JSON).",
  },
  {
    key: "WF_IDEA_USP_VALIDATION",
    name: "Idee- & USP-Validierung",
    description: "Prüft Problem-Solution-Fit und Differenzierung vor Kundentests.",
    explanation: "Erklärung: Vorvalidierung der Idee und des USP. Basiert auf: Company Profile, Market Snapshot, Industry Research. Zu Untersuchen: Problem, Zielgruppe, bestehende Lösungen, USP-Schärfe und Differenzierung. Output: value_proposition mit problem_solution_fit_score und Empfehlungen (JSON).",
  },
  {
    key: "WF_FEASIBILITY_VALIDATION",
    name: "Umsetzbarkeitsvalidierung",
    description: "Machbarkeit bzgl. Markt, Umsetzung, Risiko und Finanzen.",
    explanation: "Erklärung: Realistische Machbarkeitsprüfung vor Go/No-Go. Basiert auf: Company Profile, Market Research, Industry Research, Finanzkontext. Zu Untersuchen: Szenarien, Sensitivität, Risikomatrix, praktische Voraussetzungen. Output: scenario_analysis mit Empfehlungen (JSON).",
  },
  {
    key: "WF_PATENT_CHECK",
    name: "Patentrecht & Schutzfähigkeit",
    description: "Prüft (Teil-)Patentierbarkeit inkl. Quellen und Empfehlung.",
    explanation: "Erklärung: Einschätzung, ob und was patentiert werden kann/sollte. Basiert auf: Company Profile, Industry Research, Market Research. Zu Untersuchen: mögliche Schutzrechte, bekannte Vorarbeiten, Patentierungsstrategie, nächste Schritte. Output: strategic_options inkl. Quellenhinweisen und Empfehlungen (JSON).",
  },
  {
    key: "WF_LEGAL_FOUNDATION",
    name: "Rechtliche Vorgaben & Unternehmensform",
    description: "Rechtsrahmen für Gründung/Eröffnung inkl. geeigneter Rechtsform.",
    explanation: "Erklärung: Rechtliche Voraussetzungen für Gründung und Eröffnung. Basiert auf: Company Profile, Industry Research, Market Research. Zu Untersuchen: Genehmigungen, Registrierungen, Pflichten und passende Unternehmensform. Output: startup_consulting mit incorporation_recommendations und Checkliste (JSON).",
  },
  {
    key: "WF_CUSTOMER_VALIDATION",
    name: "Customer Validation",
    description: "Proof of Concept – MVP, Kundeninterviews, Landingpage-Tests, Pilotkunden, Prototypen.",
    explanation: "Erklärung: Beweisen, dass Kunden kaufen würden. Basiert auf: Company Profile, Market Snapshot, Market Research (feasibility, buyer_behavior). Zu Untersuchen: MVP-Scope, Hypothesen, Kundeninterviews, Landingpage-Tests, Pilotkunden, Prototypen. Kennzahlen: Conversion Rate, Customer Feedback, Zahlungsbereitschaft, Early Adopters. Output: mvp_scope, hypotheses_tested, key_metrics, recommendation (proceed/pivot/stop), next_steps (JSON).",
  },
  {
    key: "WF_PROCESS_OPTIMIZATION",
    name: "Process Optimization",
    description: "Prozessoptimierung, Kostenmanagement, Markenstrategie, Internationalisierung.",
    explanation: "Erklärung: Prozessoptimierung und Kostenmanagement für Reifephase. Basiert auf: Company Profile, KPI-Snapshot, Industry Research, Baseline. Zu Untersuchen: Prozesse, Bottlenecks, Kostentreiber, Einsparpotenzial. Kennzahlen: EBITDA, Gewinnmarge. Output: process_analysis, cost_analysis, recommendations (JSON).",
  },
  {
    key: "WF_STRATEGIC_OPTIONS",
    name: "Strategic Options",
    description: "Erneuerung, Exit, M&A, Börsengang, Nachfolgeplanung.",
    explanation: "Erklärung: Strategische Optionen für Erneuerung oder Exit. Basiert auf: Company Profile, Market Research, Industry Research, Business Plan. Zu Untersuchen: neue Geschäftsmodelle, neue Märkte, M&A (kaufen/verkaufen), Börsengang, Nachfolgeplanung. Planungsschwerpunkte: Innovationsstrategie, Portfolioanpassung, Unternehmenswert steigern. Kennzahlen: Unternehmensbewertung, Wachstumspotenzial, strategischer Fit. Output: strategic_options, exit_readiness, recommendations (JSON).",
  },
  {
    key: "WF_VALUE_PROPOSITION",
    name: "Value Proposition & Problem-Solution-Fit",
    description: "Problem-Solution-Fit, Value Proposition Design, Zielgruppenanalyse.",
    explanation: "Erklärung: Prüfen, ob Problem und Lösung zusammenpassen. Basiert auf: Company Profile, Market Snapshot, Industry Research. Zu Untersuchen: Welches Problem? Wer hat es? Bestehende Lösungen? USP? Output: problem_statement, target_customers, unique_value_proposition, key_differentiators (JSON).",
  },
  {
    key: "WF_GO_TO_MARKET",
    name: "Go-to-Market & Pricing",
    description: "Pricing Strategie, Go-to-Market, Marketingstrategie, Vertriebskanäle.",
    explanation: "Erklärung: Pricing, Go-to-Market und Vertrieb für Launch. Basiert auf: Company Profile, Market Snapshot, Market Research, Business Plan. Zu Untersuchen: Pricing Strategie, Go-to-Market Strategie, Marketingstrategie, Vertriebskanäle. Kritisch: Kundengewinnungskosten, Vertriebssystem. Output: pricing_strategy, sales_channels, go_to_market_plan (JSON).",
  },
  {
    key: "WF_SCALING_STRATEGY",
    name: "Scaling Strategy",
    description: "Skalierung, Automatisierung, Marketing-Skalierung, Vertriebssysteme.",
    explanation: "Erklärung: Skalierungsstrategie für Wachstumsphase. Basiert auf: Company Profile, KPI-Snapshot, Market Research, Baseline. Zu Untersuchen: Skalierbarkeit des Modells, Automatisierung von Prozessen, Marketing-Skalierung, Vertriebssysteme. KPIs: CAC, LTV, Conversion Rate, Churn Rate, Umsatzwachstum. Output: scalability_assessment, automation_priorities, key_metrics (JSON).",
  },
  {
    key: "WF_PORTFOLIO_MANAGEMENT",
    name: "Portfolio & Brand Strategy",
    description: "Portfolio Management, Markenstrategie, Internationalisierung, strategische Partnerschaften.",
    explanation: "Erklärung: Portfolio- und Markenstrategie für Reifephase. Basiert auf: Company Profile, KPI-Snapshot, Industry Research. Zu Untersuchen: Produktportfolio optimieren, Marktsegmente erweitern, strategische Partnerschaften. Kennzahlen: Marktanteil, Kundenbindung. Output: portfolio_analysis, brand_strategy_recommendations (JSON).",
  },
  {
    key: "WF_SCENARIO_ANALYSIS",
    name: "Scenario & Risk Analysis",
    description: "Szenarioanalyse, Sensitivitätsanalyse, Risikomatrix.",
    explanation: "Erklärung: Szenario- und Risikoanalyse. Basiert auf: Company Profile, Market Research, Baseline, Business Plan. Zu Untersuchen: Szenarien, Sensitivität, Risikomatrix. Output: scenarios, sensitivity_analysis, risk_matrix (JSON).",
  },
  {
    key: "WF_OPERATIVE_PLAN",
    name: "Operative Plan",
    description: "Jahresplanung, Marketingplan, Vertriebsplanung, Budgetplanung.",
    explanation: "Erklärung: Operative Jahresplanung. Basiert auf: Company Profile, KPI-Snapshot, Industry Research, Market Research. Zu Untersuchen: Jahresplan, Marketing, Vertrieb, Budget. Output: annual_plan_summary, key_milestones, recommendations (JSON).",
  },
  {
    key: "WF_COMPETITOR_ANALYSIS",
    name: "Wettbewerbsanalyse",
    description: "Tiefe Analyse der Wettbewerber, Marktposition, Differenzierung.",
    explanation: "Erklärung: Vertiefte Wettbewerbsanalyse. Basiert auf: Company Profile, Market Snapshot, Industry Research. Zu Untersuchen: Stärken/Schwächen der Wettbewerber, Marktposition, Differenzierungsmöglichkeiten. Output: competitors, competitive_landscape, differentiation_opportunities (JSON).",
  },
  {
    key: "WF_SWOT",
    name: "SWOT-Analyse",
    description: "Stärken, Schwächen, Chancen, Bedrohungen.",
    explanation: "Erklärung: SWOT-Analyse für strategische Positionierung. Basiert auf: Company Profile, Market Snapshot, Industry Research. Zu Untersuchen: Stärken, Schwächen, Chancen, Bedrohungen. Output: strengths, weaknesses, opportunities, threats, strategic_implications (JSON).",
  },
  {
    key: "WF_FINANCIAL_PLANNING",
    name: "Finanzplanung",
    description: "Liquiditätsplan, Rentabilitätsplan, Kapitalbedarf, Break-Even.",
    explanation: "Erklärung: Finanzplanung für Launch. Basiert auf: Company Profile, Supplier List, Real Estate, Business Plan. Zu Untersuchen: Liquiditätsplan, Rentabilitätsplan, Kapitalbedarf, Break-Even Analyse. Kritisch: Cashflow Management, Liquiditätsreserve. Output: liquidity_plan, profitability_plan, capital_requirements, break_even_analysis (JSON).",
  },
  {
    key: "WF_STRATEGIC_PLANNING",
    name: "Strategische Planung",
    description: "Marktposition, Wettbewerbsvorteile, Innovation (3–10 Jahre).",
    explanation: "Erklärung: Langfristige strategische Ausrichtung. Basiert auf: Company Profile, Market Snapshot, Market Research, Industry Research. Zu Untersuchen: Marktposition, Wettbewerbsvorteile, Innovation. Output: market_position, competitive_advantages, strategic_initiatives (JSON).",
  },
  {
    key: "WF_TREND_ANALYSIS",
    name: "Trendanalyse",
    description: "Makrotrends, Branchentrends, Technologietrends.",
    explanation: "Erklärung: Trendanalyse für strategische Entscheidungen. Basiert auf: Company Profile, Market Snapshot, Industry Research. Zu Untersuchen: Makrotrends, Branchentrends, Technologietrends, Regulierung. Output: macro_trends, industry_trends, implications_for_business (JSON).",
  },
  {
    key: "WF_TECH_DIGITALIZATION",
    name: "Technologie & Digitalisierung",
    description: "Kassensystem, Dokumentenarchivierung, Buchhaltung, CRM und weitere Tools.",
    explanation: "Erklärung: Passende Technologie-Tools für die Digitalisierung. Basiert auf: Company Profile, Industry Research. Zu Untersuchen: Kassensystem, Dokumentenarchivierung, Buchhaltung, CRM, weitere branchenspezifische Tools. Output: tech_digitalization (JSON).",
  },
  {
    key: "WF_AUTOMATION_ROI",
    name: "Computer-Automatisierung & ROI",
    description: "RPA, Prozessautomatisierung mit Kosten und ROI.",
    explanation: "Erklärung: Computer-basierte Prozessautomatisierung mit Preis und ROI. Basiert auf: Company Profile, Work Processes. Zu Untersuchen: RPA, Automatisierbare Prozesse, Kosten, ROI, Amortisation. Output: automation_roi (JSON).",
  },
  {
    key: "WF_PHYSICAL_AUTOMATION",
    name: "Physische Prozess-Automatisierung",
    description: "Teigmaschine, Thermomix, Laufbänder – Kosten, ROI, Sinnhaftigkeit.",
    explanation: "Erklärung: Physische Geräte zur Prozessautomatisierung. Basiert auf: Company Profile, Industry. Zu Untersuchen: Teigmaschine, Thermomix, Laufbänder, Förderbänder – Kosten, ROI, ob es sinnvoll ist. Output: physical_automation (JSON).",
  },
  {
    key: "WF_APP_DEVELOPMENT",
    name: "Eigene App – Entwicklung",
    description: "Projektplanung, Requirements, Tech-Spec, MVP-Anleitung, Seiten-Spezifikation, DB-Schema.",
    explanation: "Erklärung: Vollständige App-Entwicklung von Ideen bis Implementierung. Basiert auf: Company Profile, Value Proposition. Zu Untersuchen: App-Ideen, Requirements, Technische Spezifikation, MVP-Anleitung für Entwickler, Seiten-Spezifikation, Datenbank-Aufbau. Output: app_project_plan, app_requirements, app_tech_spec, app_mvp_guide, app_page_specs, app_db_schema (JSON).",
  },
] as const;

export const WORKFLOW_BY_KEY = Object.fromEntries(WORKFLOWS.map((w) => [w.key, w])) as Record<string, { key: string; name: string; description: string; explanation: string }>;

export function getWorkflowName(key: string): string {
  return WORKFLOW_BY_KEY[key]?.name ?? key;
}

export function getWorkflowSubtitle(key: string, runId?: string, status?: string): string {
  const parts = [key];
  if (runId) parts.push(`#${runId.slice(0, 8)}`);
  if (status) parts.push(status);
  return parts.join(" · ");
}

export function getWorkflowExplanation(key: string): string {
  return WORKFLOW_BY_KEY[key]?.explanation ?? "";
}

/** Splits explanation into lines (Erklärung, Basiert auf, Zu Untersuchen, Output) */
export function getWorkflowExplanationLines(key: string): string[] {
  const text = getWorkflowExplanation(key);
  if (!text) return [];
  return text
    .split(/\s+(?=Basiert auf:|Zu Untersuchen:|Output:)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
