export const WORKFLOWS = [
  {
    key: "WF_BUSINESS_FORM",
    name: "Business Form",
    description: "Manuelles Ausfüllen des Unternehmensprofils (Intake).",
    explanation: "Erklärung: Erster Schritt – manuelles Ausfüllen des Business-Formulars. Basiert auf: nichts (Start). Output: Company Profile, Intake Session (gespeichert in DB).",
  },
  {
    key: "WF_BASELINE",
    name: "Grundlagenanalyse",
    description: "Business model + KPI setup + gap scan.",
    explanation: "Erklärung: Grundlage für alle weiteren Workflows. Basiert auf: Company Profile (Intake). Zu Untersuchen: Geschäftsmodell, KPI-Auswahl, Lückenanalyse, Branchendaten. Output: Business-Model-Klassifikation, KPI-Set, KPI-Gap-Report, Industry Research (JSON).",
  },
  {
    key: "WF_MARKET",
    name: "Marktüberblick",
    description: "Segments, competitors, pricing, demand.",
    explanation: "Erklärung: Kompakte Marktübersicht für spätere Workflows. Basiert auf: Industry Research, Company Profile. Zu Untersuchen: Marktsegmente, Wettbewerber, Preise, Nachfrage-Treiber. Output: Liste mit segments, competitors, pricing_index, demand_drivers, risks (JSON).",
  },
  {
    key: "WF_RESEARCH",
    name: "Markt- und Best-Practice-Analyse",
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
    name: "Lieferantenliste",
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
    name: "Standortoptionen",
    description: "Rent, utilities (Strom, Wasser etc.) – for fixed costs.",
    explanation: "Erklärung: Immobilienoptionen für Fixkostenplanung (Miete, Nebenkosten). Basiert auf: Market Snapshot (Segmente), Industry Research, Company Profile (Standort, Branche, Angebot). Zu Untersuchen: Büros, Retail, Lager – Miete, Strom, Wasser, Nebenkosten. Output: Liste von Optionen mit type, location, price_range, suitability (JSON).",
  },
  {
    key: "WF_DIAGNOSTIC",
    name: "Ursachenanalyse",
    description: "Root-Cause-Bäume für KPI-Lücken – Basis für Skalierung.",
    explanation: "Erklärung: Ursachenanalyse für KPI-Lücken in der Wachstumsphase. Basiert auf: Baseline (kpi_table, top_gaps, data_quality_alerts), KPI-Set, Industry Research. Zu Untersuchen: Root-Cause-Bäume für Top-Gaps. Prozesse standardisieren vor Skalierung. Output: root_cause_trees (JSON).",
  },
  {
    key: "WF_NEXT_BEST_ACTIONS",
    name: "Nächste beste Schritte",
    description: "Top-5 decisions + 30/60/90 plan.",
    explanation: "Erklärung: Top-5-Entscheidungen und 30/60/90-Plan. Basiert auf: Market Research (feasibility, supply_demand), Best Practices, Failure Analysis, Industry Research, KPI-Set. Zu Untersuchen: Priorisierte Initiativen, Umsetzungsplan, Guardrails. Output: decision_proposals, execution_plan_30_60_90, guardrails (JSON).",
  },
  {
    key: "WF_MARKETING_STRATEGY",
    name: "Marketing Strategie",
    description: "Marketingstrategie für Wachstum inkl. Conversion Funnel und Social-Media-Content-Plan.",
    explanation: "Erklärung: Marketingstrategie für die Wachstumsphase. Basiert auf: Baseline, Next Best Actions, Market Research, Industry Research, Company Profile. Zu Untersuchen: Marketingkanäle, Zielgruppen, Budgetverteilung, Kampagnenplanung, Messung, Funnel-Stufen/Drop-offs sowie ein kanalbasierter Social-Media-Content-Plan. Output: marketing_strategy, conversion_funnel_analysis, social_media_content_plan (JSON).",
  },
  {
    key: "WF_BUSINESS_PLAN",
    name: "Businessplan & Finanzen",
    description: "Businessplan, Marketingstrategie, 3 Finanzszenarien.",
    explanation: "Erklärung: Vollständiger Businessplan für Launch. Basiert auf: Market Snapshot, Failure Analysis, Supplier List, Real Estate, Industry Research, Company Profile. Zu Untersuchen: Executive Summary, Marktanalyse, Marketingstrategie, Finanzszenarien (3 Szenarien), Risikoanalyse. Kritisch: Cashflow Management. Output: Business Plan mit 5 Sektionen (JSON).",
  },
  {
    key: "WF_KPI_ESTIMATION",
    name: "KPI-Schätzung",
    description: "Estimate KPIs from business data, market analysis, strategies, and growth plans.",
    explanation: "Erklärung: KPI-Prognosen (Monat 1 und Monat 12) für alle geschäftsrelevanten KPIs. Zeigt die erwartete Entwicklung über das Jahr. Basiert auf: Company Profile, Industry Research, Market Snapshot, Market Research, Baseline, Business Plan, Financial Planning. Output: kpi_estimates mit value_month_1 und value_month_12 pro KPI.",
  },
  {
    key: "WF_DATA_COLLECTION_PLAN",
    name: "Datenerhebungsplan",
    description: "Fallback when data is missing inkl. Data-Strategy.",
    explanation: "Erklärung: Plan zur Datenerhebung für fehlende KPIs. Basiert auf: KPI-Set, missing_inputs, Company Profile. Zu Untersuchen: Welche Daten fehlen, wie sie erhoben werden und welche Datenstrategie/Instrumentierung nötig ist. Output: questions_simple, mapping_to_kpi_keys, data_strategy (JSON).",
  },
  {
    key: "WF_STARTUP_CONSULTING",
    name: "Funding",
    description: "Rechtsform, Funding, Gründungsoptionen und Capital Strategy.",
    explanation: "Erklärung: Rechtsform und Finanzierungsempfehlungen für Launch. Basiert auf: Company Profile (stage, industry, funding_status, legal_structure), Startup Insights, Industry Research. Zu Untersuchen: Rechtsform, Finanzierungsmodelle, Gründungsoptionen und Kapitalmix/Roadmap. Output: startup_consulting, capital_strategy (JSON).",
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
    description: "Prozessoptimierung inkl. CX, Organisation/Rollen und Hiring-Strategie.",
    explanation: "Erklärung: Prozessoptimierung und Kostenmanagement für Reifephase. Basiert auf: Company Profile, KPI-Snapshot, Industry Research, Baseline. Zu Untersuchen: Prozesse, Bottlenecks, Kostentreiber, Einsparpotenzial, Customer Experience sowie Organisations-/Rollenklarheit und Hiring-Prioritäten. Kennzahlen: EBITDA, Gewinnmarge. Output: process_optimization, customer_experience_cx, organization_roles, hiring_talent_strategy (JSON).",
  },
  {
    key: "WF_STRATEGIC_OPTIONS",
    name: "Strategic Options",
    description: "Erneuerung, Exit, M&A, Börsengang, Nachfolgeplanung.",
    explanation: "Erklärung: Strategische Optionen für Erneuerung oder Exit. Basiert auf: Company Profile, Market Research, Industry Research, Business Plan. Zu Untersuchen: neue Geschäftsmodelle, neue Märkte, M&A (kaufen/verkaufen), Börsengang, Nachfolgeplanung. Planungsschwerpunkte: Innovationsstrategie, Portfolioanpassung, Unternehmenswert steigern. Kennzahlen: Unternehmensbewertung, Wachstumspotenzial, strategischer Fit. Output: strategic_options, exit_readiness, recommendations (JSON).",
  },
  {
    key: "WF_VALUE_PROPOSITION",
    name: "Wertversprechen & Problem-Lösungs-Fit",
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
    name: "Skalierungsstrategie",
    description: "Skalierung, Automatisierung, LTV/CAC, PMF und Growth Loops.",
    explanation: "Erklärung: Skalierungsstrategie für Wachstumsphase. Basiert auf: Company Profile, KPI-Snapshot, Market Research, Baseline. Zu Untersuchen: Skalierbarkeit des Modells, Automatisierung von Prozessen, Marketing-Skalierung, Vertriebssysteme sowie Customer Economics (LTV/CAC), Product-Market-Fit und Growth Loops. KPIs: CAC, LTV, Conversion Rate, Churn Rate, Umsatzwachstum. Output: scaling_strategy, customer_economics_ltv_cac, pmf_assessment, growth_loops (JSON).",
  },
  {
    key: "WF_GROWTH_MARGIN_OPTIMIZATION",
    name: "Marge, Angebot & Kostenoptimierung",
    description: "Deckungsbeitrag pro Verkauf, Angebots-/Packaging-Logik, Marketing-Hebel, Kosten & Personal.",
    explanation: "Erklärung: Situationsanalyse und Optimierung in der Wachstumsphase. Basiert auf: Baseline, KPIs, Markt-/Businessplan, Go-to-Market, Marketing, ggf. Warenkosten und Finanzplanung. Zu Untersuchen: was pro Verkauf wirtschaftlich hängen bleibt; wie Angebot und Kommunikation Preis oder Absatz heben können; Kostentreiber und Einsparpotenziale (Personal, Einkauf, Energie, Verpackung). Wenn Daten fehlen: Branchen-Checkliste mit Beispielen zum Selbstprüfen. Output: growth_margin_optimization (JSON).",
  },
  {
    key: "WF_PORTFOLIO_MANAGEMENT",
    name: "Portfolio- & Markenstrategie",
    description: "Portfolio Management, Markenstrategie, Internationalisierung, strategische Partnerschaften.",
    explanation: "Erklärung: Portfolio- und Markenstrategie für Reifephase. Basiert auf: Company Profile, KPI-Snapshot, Industry Research. Zu Untersuchen: Produktportfolio optimieren, Marktsegmente erweitern, strategische Partnerschaften. Kennzahlen: Marktanteil, Kundenbindung. Output: portfolio_analysis, brand_strategy_recommendations (JSON).",
  },
  {
    key: "WF_SCENARIO_ANALYSIS",
    name: "Szenario- & Risikoanalyse",
    description: "Szenarioanalyse, Sensitivitätsanalyse, Risikomatrix.",
    explanation: "Erklärung: Szenario- und Risikoanalyse. Basiert auf: Company Profile, Market Research, Baseline, Business Plan. Zu Untersuchen: Szenarien, Sensitivität, Risikomatrix. Output: scenarios, sensitivity_analysis, risk_matrix (JSON).",
  },
  {
    key: "WF_OPERATIVE_PLAN",
    name: "Operativer Plan",
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
    description: "Liquiditätsplan, Rentabilitätsplan, Kapitalbedarf, Break-Even, Business-Model-Mechanics.",
    explanation: "Erklärung: Finanzplanung für Launch. Basiert auf: Company Profile, Supplier List, Real Estate, Business Plan; bei vorhandenem Artefakt auch Inventar & Equipment (Markteintritt) für Investitionskosten im Kapitalbedarf. Zu Untersuchen: Liquiditätsplan, Rentabilitätsplan, Kapitalbedarf inkl. Inventar/Equipment, Break-Even Analyse und Monetarisierungs-/Margenlogik des Geschäftsmodells. Kritisch: Cashflow Management, Liquiditätsreserve. Output: business_model_mechanics, liquidity_plan, profitability_plan, capital_requirements, break_even_analysis (JSON).",
  },
  {
    key: "WF_STRATEGIC_PLANNING",
    name: "Strategische Planung",
    description: "Marktposition, Wettbewerbsvorteile, Innovation, Barriers-to-Entry und Moat (3–10 Jahre).",
    explanation: "Erklärung: Langfristige strategische Ausrichtung. Basiert auf: Company Profile, Market Snapshot, Market Research, Industry Research. Zu Untersuchen: Marktposition, Wettbewerbsvorteile, Innovation, Eintrittsbarrieren und Verteidigbarkeit (Moat). Output: strategic_planning, barriers_to_entry, moat_assessment (JSON).",
  },
  {
    key: "WF_TREND_ANALYSIS",
    name: "Trendanalyse",
    description: "Makrotrends, Branchentrends, Technologietrends plus strukturierte PESTEL-Analyse.",
    explanation: "Erklärung: Trendanalyse für strategische Entscheidungen. Basiert auf: Company Profile, Market Snapshot, Industry Research. Zu Untersuchen: Makrotrends, Branchentrends, Technologietrends, Regulierung sowie politische, wirtschaftliche, soziale, technologische, ökologische und rechtliche Faktoren (PESTEL). Output: trend_analysis, pestel_analysis (JSON).",
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
    key: "WF_INVENTORY_LAUNCH",
    name: "Inventar & Equipment (Markteintritt)",
    description: "Bestandsliste mit Unternehmensform, Prozessabgleich, fehlendes Equipment für erste Verkäufe (Preis & Links), dann Effizienz-Upgrades für die Skalierung.",
    explanation: "Erklärung: Vier Schritte – (1) Inventar Geräte/Material mit Bezug zur Rechtsform, (2) Abgleich mit Arbeitsprozessen, (3) Markteintritt: fehlende Anschaffungen mit Richtpreisen und Web-Links, (4) spätere Phase: Maschinen/Equipment zur Effizienzsteigerung. Output: inventory_equipment_plan (JSON).",
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
  if (status) {
    const statusLabel: Record<string, string> = {
      draft: "Entwurf",
      running: "Läuft",
      incomplete: "Unvollständig",
      complete: "Abgeschlossen",
      approved: "Freigegeben",
      failed: "Fehlgeschlagen",
    };
    parts.push(statusLabel[status] ?? status);
  }
  return parts.join(" · ");
}

export function getWorkflowExplanation(key: string): string {
  return WORKFLOW_BY_KEY[key]?.explanation ?? "";
}

const SIMPLE_EXPLANATIONS: Record<string, string> = {
  WF_BUSINESS_FORM:
    "Hier gibst du die wichtigsten Basisdaten zu deinem Unternehmen ein. Diese Angaben sind die Grundlage, damit die KI die folgenden Prozesse passend für deine Situation ausführen kann.",
  WF_BASELINE:
    "Dieser Prozess erstellt eine Ausgangsanalyse deines Unternehmens. Du bekommst ein erstes Bild zu Geschäftsmodell, wichtigen Kennzahlen und möglichen Lücken als Startpunkt für alle weiteren Schritte.",
  WF_MARKET:
    "Es wird ein Überblick über die Marktsituation mit Hilfe von Analysen erstellt – als Grundlage für weitere Prozesse und erste Einschätzungen. Das Ergebnis wird als Dokument gespeichert und in der nächsten Phase weiterverwendet.",
  WF_RESEARCH:
    "Hier wird untersucht, wie Kundinnen und Kunden wirklich entscheiden, welche Angebote es am Markt gibt und was erfolgreiche Unternehmen in deiner Branche konkret gut machen (Best Practices = bewährte Vorgehensweisen). Daraus bekommst du klare Empfehlungen, was du übernehmen und was du vermeiden solltest. Das Ergebnis wird als Dokument für die nächste Phase gespeichert.",
  WF_MENU_CARD:
    "Hier wird dein Angebot strukturiert beschrieben, also was du genau anbietest und aus welchen Bestandteilen es besteht. Das hilft, Preise, Einkauf und weitere Planungen realistischer zu machen.",
  WF_SUPPLIER_LIST:
    "Dieser Prozess sucht passende Lieferanten für die benötigten Bestandteile deines Angebots. So bekommst du eine praktische Grundlage für Einkauf, Kostenplanung und Verhandlungen.",
  WF_MENU_COST:
    "Hier werden die Kosten pro Angebot oder Produkt berechnet. Dadurch siehst du, was dich einzelne Leistungen wirklich kosten und wie viel Marge übrig bleibt.",
  WF_MENU_PRICING:
    "In diesem Prozess werden auf Basis deiner Kosten sinnvolle Verkaufspreise vorgeschlagen. Ziel ist, dass deine Preise marktgerecht sind und gleichzeitig wirtschaftlich funktionieren.",
  WF_REAL_ESTATE:
    "Hier werden mögliche Standorte und deren Kosten verglichen. So erkennst du, welche Option zu deinem Geschäftsmodell passt und welche laufenden Belastungen zu erwarten sind.",
  WF_DIAGNOSTIC:
    "Dieser Prozess erklärt, warum bestimmte Kennzahlen schlecht oder besser als erwartet ausfallen. Er zeigt die wichtigsten Ursachen, damit du gezielt an den richtigen Stellen ansetzt.",
  WF_NEXT_BEST_ACTIONS:
    "Hier bekommst du priorisierte nächste Schritte mit klarem Fokus auf Wirkung und Umsetzbarkeit. So weißt du, was du als Nächstes konkret tun solltest.",
  WF_MARKETING_STRATEGY:
    "Dieser Prozess erstellt eine verständliche Marketingstrategie für deine Zielgruppe. Du erhältst konkrete Maßnahmen, Kanäle und Prioritäten für bessere Sichtbarkeit und Kundengewinnung.",
  WF_BUSINESS_PLAN:
    "Hier wird ein strukturierter Businessplan mit Markt-, Strategie- und Finanzteilen erstellt. Das hilft dir bei Entscheidungen, bei Gesprächen mit Partnern und bei Finanzierungsfragen.",
  WF_KPI_ESTIMATION:
    "Dieser Prozess schätzt wichtige Kennzahlen für die nächsten Monate. So bekommst du eine realistische Orientierung, wie sich Umsatz, Kosten und andere KPIs entwickeln können.",
  WF_DATA_COLLECTION_PLAN:
    "Hier wird festgelegt, welche Daten dir noch fehlen und wie du sie sammeln kannst. Dadurch werden spätere Auswertungen verlässlicher und Entscheidungen fundierter.",
  WF_STARTUP_CONSULTING:
    "Dieser Prozess gibt Orientierung zu Gründung, Finanzierung und passenden Optionen für dein Vorhaben. Er hilft dir, typische Startfehler zu vermeiden und den nächsten Schritt klar zu planen.",
  WF_IDEA_USP_VALIDATION:
    "Hier wird geprüft, ob deine Idee wirklich ein relevantes Problem löst und klar unterscheidbar ist. Du erkennst, ob dein Nutzenversprechen für Kunden verständlich und stark genug ist.",
  WF_FEASIBILITY_VALIDATION:
    "Dieser Prozess prüft, ob dein Vorhaben praktisch und wirtschaftlich umsetzbar ist. Du erhältst eine Einschätzung zu Risiken, Voraussetzungen und realistischer Machbarkeit.",
  WF_PATENT_CHECK:
    "Hier wird eingeschätzt, ob Teile deiner Idee schutzfähig sind und welche nächsten Schritte sinnvoll wären. Das hilft dir, rechtliche Risiken früh zu erkennen.",
  WF_LEGAL_FOUNDATION:
    "Dieser Prozess zeigt die wichtigsten rechtlichen Anforderungen für Gründung und Betrieb. Du bekommst Klarheit zu Rechtsform, Pflichten und notwendigen Schritten.",
  WF_CUSTOMER_VALIDATION:
    "Hier wird geprüft, ob echte Kundinnen und Kunden dein Angebot tatsächlich kaufen würden. Du bekommst konkrete Signale aus Tests, Interviews oder Pilotfeedback.",
  WF_PROCESS_OPTIMIZATION:
    "Dieser Prozess analysiert deine Abläufe und zeigt, wo Zeit, Geld oder Qualität verloren geht. Ziel ist, Prozesse einfacher, schneller und wirtschaftlicher zu machen.",
  WF_STRATEGIC_OPTIONS:
    "Hier werden strategische Optionen gegenübergestellt, zum Beispiel Wachstum, Neuausrichtung oder Exit. So kannst du fundiert entscheiden, welche Richtung am besten passt.",
  WF_VALUE_PROPOSITION:
    "Dieser Prozess schärft dein Wertversprechen: Für wen ist dein Angebot, welches Problem löst es und warum ist es besser als Alternativen. Das schafft Klarheit für Produkt, Marketing und Vertrieb.",
  WF_GO_TO_MARKET:
    "Hier wird geplant, wie du dein Angebot erfolgreich in den Markt bringst. Du erhältst eine klare Linie für Positionierung, Preise, Kanäle und erste Verkaufsaktivitäten.",
  WF_SCALING_STRATEGY:
    "Dieser Prozess zeigt, wie dein Unternehmen kontrolliert wachsen kann. Er macht sichtbar, welche Bereiche zuerst skaliert werden sollten und welche Voraussetzungen dafür nötig sind.",
  WF_GROWTH_MARGIN_OPTIMIZATION:
    "Hier werden Marge pro Verkauf, Angebotsgestaltung und Kostentreiber zusammengeführt. Du siehst, was sich rechnet, was du kommunizieren kannst, und wo du realistisch sparen oder nachjustieren solltest.",
  WF_PORTFOLIO_MANAGEMENT:
    "Hier wird bewertet, welche Produkte oder Leistungen gestärkt, angepasst oder reduziert werden sollten. Das hilft, Ressourcen auf die wichtigsten Umsatztreiber zu konzentrieren.",
  WF_SCENARIO_ANALYSIS:
    "Dieser Prozess betrachtet verschiedene Zukunftsszenarien und deren Auswirkungen. So bist du besser auf Unsicherheiten vorbereitet und kannst robuster planen.",
  WF_OPERATIVE_PLAN:
    "Hier wird die Umsetzung für den Alltag geplant, mit konkreten Aufgaben, Meilensteinen und Verantwortlichkeiten. Dadurch wird aus Strategie ein machbarer Arbeitsplan.",
  WF_COMPETITOR_ANALYSIS:
    "Dieser Prozess analysiert deine wichtigsten Wettbewerber, deren Stärken und Schwächen. So erkennst du, wie du dich klar abgrenzen und besser positionieren kannst.",
  WF_SWOT:
    "In dieser SWOT-Analyse werden die Stärken und Schwächen deines Unternehmens sowie Chancen und Risiken im Markt übersichtlich gegenübergestellt. So erkennst du schnell, wo du gut aufgestellt bist, wo Handlungsbedarf besteht und welche nächsten Schritte strategisch sinnvoll sind.",
  WF_FINANCIAL_PLANNING:
    "Hier wird deine Finanzplanung aufgebaut, zum Beispiel Kosten, Liquidität, Kapitalbedarf und Break-even. Wenn du den Prozess „Inventar & Equipment“ genutzt hast, fließen dessen Investitionskosten in den Kapitalbedarf ein. Damit siehst du früh, ob dein Vorhaben finanziell tragfähig ist.",
  WF_STRATEGIC_PLANNING:
    "Dieser Prozess richtet dein Unternehmen langfristig aus und definiert klare Ziele für die nächsten Jahre. So entsteht ein roter Faden für wichtige Entscheidungen.",
  WF_TREND_ANALYSIS:
    "Hier werden relevante Markt-, Technologie- und Branchentrends eingeordnet. Dadurch erkennst du früh Chancen und Risiken, die dein Geschäft beeinflussen.",
  WF_TECH_DIGITALIZATION:
    "Dieser Prozess empfiehlt passende digitale Tools für dein Unternehmen. Ziel ist, Arbeitsabläufe zu vereinfachen, Transparenz zu erhöhen und Zeit zu sparen.",
  WF_AUTOMATION_ROI:
    "Hier wird geprüft, welche Aufgaben digital automatisiert werden können und ob sich das wirtschaftlich lohnt. Du bekommst eine klare Einschätzung zu Kosten und Nutzen.",
  WF_PHYSICAL_AUTOMATION:
    "Dieser Prozess bewertet Maschinen oder physische Automatisierungslösungen für deinen Betrieb. So siehst du, ob Investitionen in Geräte deinen Alltag messbar verbessern.",
  WF_INVENTORY_LAUNCH:
    "Hier erfasst du Geräte und Material, ordnest sie deiner Unternehmensform und deinen Prozessen zu, findest fehlende Anschaffungen für die ersten Verkäufe inklusive Richtpreisen und Links, und planst spätere Investitionen in Effizienz (z. B. professionelle statt manuelle Ausrüstung).",
  WF_APP_DEVELOPMENT:
    "Hier wird die Entwicklung einer eigenen App von der Idee bis zur technischen Struktur geplant. Du bekommst einen klaren Fahrplan, was gebaut werden soll und in welcher Reihenfolge.",
};

/** Returns one short, simple explanation line per process. */
export function getWorkflowExplanationLines(key: string): string[] {
  const workflow = WORKFLOW_BY_KEY[key];
  if (!workflow) return [];
  if (SIMPLE_EXPLANATIONS[key]) return [SIMPLE_EXPLANATIONS[key]];
  const raw = (workflow.explanation ?? "").trim();
  if (raw) {
    const withoutPrefix = raw.replace(/^Erklärung:\s*/i, "");
    const mainPart = withoutPrefix.split(/\s+(?=Basiert auf:|Zu Untersuchen:|Output:)/)[0]?.trim() ?? "";
    if (mainPart) {
      return [mainPart];
    }
  }
  return [
    `Dieser Prozess erstellt eine strukturierte Auswertung zu "${workflow.name}" als Grundlage für die nächsten Entscheidungen.`,
  ];
}
