/**
 * Sehr kurze Erklärung für die Infobox „Was dieses Dokument zeigt“ — für Menschen,
 * die den Dokumenttyp noch nicht kennen (einfache Sprache, wenig Fachjargon).
 */
const INTROS: Record<string, string> = {
  baseline:
    "Dieses Dokument bildet die Ausgangslage Ihres Unternehmens ab: zentrale Kennzahlen, Annahmen und Rahmenbedingungen zu Beginn der Analyse. Es dient als Referenzpunkt, um spätere Veränderungen strukturiert zu vergleichen.",
  industry_research:
    "Dieses Dokument fasst Branchenstruktur, Marktmechanismen und relevante Trends zusammen. Es hilft, Ihr Vorhaben im Branchenkontext einzuordnen und branchentypische Chancen sowie Risiken früh zu erkennen.",
  market:
    "Dieses Dokument beschreibt Zielgruppen, Kundensegmente, Wettbewerbsumfeld und Marktpotenziale in einer kompakten Übersicht. Es schafft die Grundlage für Positionierung und Priorisierung im Markteintritt.",
  market_research:
    "Dieses Dokument vertieft die Marktsicht durch Nachfrageindikatoren, Preisniveaus, Kundenzugänge und beobachtbare Entwicklungen. Es dient als evidenzbasierte Basis für Vertriebs- und Angebotsentscheidungen.",
  diagnostic:
    "Dieses Dokument identifiziert operative Schwachstellen, Engpässe und Ursachen innerhalb Ihrer aktuellen Abläufe. Es zeigt, an welchen Punkten Verbesserungen den größten Hebel auf Qualität, Geschwindigkeit oder Kosten haben.",
  decision_pack:
    "Dieses Dokument bündelt Entscheidungsoptionen, Bewertungskriterien und eine nachvollziehbare Gegenüberstellung der Alternativen. Es unterstützt dabei, strategische Entscheidungen transparent und begründet zu treffen.",
  data_collection_plan:
    "Dieses Dokument definiert, welche Daten in welcher Qualität, Frequenz und Verantwortlichkeit erhoben werden sollen. Es stellt sicher, dass spätere Auswertungen auf konsistenten und belastbaren Daten beruhen.",
  knowledge_digest:
    "Dieses Dokument verdichtet die wichtigsten Erkenntnisse aus Quellen, Dokumenten und Wissenseinträgen in einer strukturierten Zusammenfassung. Es erleichtert den schnellen Überblick über den aktuellen Wissensstand.",
  strategy_pack:
    "Dieses Dokument kombiniert zentrale strategische Bausteine in einem Gesamtbild und ordnet sie nach Relevanz. Es dient als Arbeitsgrundlage, um priorisierte Maßnahmen systematisch abzuleiten.",
  best_practices:
    "Bewährte Vorgehensweisen aus vergleichbaren Situationen: konkrete Methoden, Abläufe und Entscheidungsmuster, die sich in der Praxis als wirksam erwiesen haben. Dient als Orientierungsrahmen für die eigene Umsetzung.",
  failure_analysis:
    "Dieses Dokument analysiert potenzielle Fehlerquellen, Ausfallursachen und kritische Abhängigkeiten. Es unterstützt ein frühzeitiges Risikomanagement und verbessert die Robustheit geplanter Maßnahmen.",
  business_plan:
    "Dieses Dokument strukturiert Ihr Geschäftsmodell, zentrale Annahmen, finanzielle Eckpunkte und operative Umsetzungsschritte. Es dient als konsistente Entscheidungs- und Kommunikationsgrundlage für interne und externe Stakeholder.",
  menu_card:
    "Dieses Dokument stellt Ihr Angebotsportfolio strukturiert dar, inklusive Produktgruppen und Ausprägungen. Es unterstützt sowohl die externe Darstellung als auch die interne Steuerung des Angebots.",
  supplier_list:
    "Dieses Dokument listet relevante Lieferanten, Beschaffungsquellen und zugehörige Abhängigkeiten auf. Es schafft Transparenz für Einkauf, Qualitätssicherung und Versorgungssicherheit.",
  menu_cost:
    "Dieses Dokument zeigt die Kostenstruktur einzelner Angebote und macht Kostentreiber sichtbar. Es bildet die Basis für fundierte Preis- und Margenentscheidungen.",
  menu_preiskalkulation:
    "Dieses Dokument leitet Verkaufspreise aus Kosten, Zielmargen und Marktannahmen ab. Es unterstützt eine wirtschaftlich tragfähige Preisgestaltung.",
  real_estate:
    "Dieses Dokument bewertet Standort- oder Immobilienoptionen anhand relevanter Kriterien wie Kosten, Lagequalität und Nutzungsfit. Es dient als Entscheidungshilfe für Standortfragen.",
  startup_guide:
    "Dieses Dokument beschreibt die wichtigsten Startschritte in sinnvoller Reihenfolge und mit konkreten Handlungshinweisen. Es unterstützt einen strukturierten Aufbau in der frühen Unternehmensphase.",
  customer_validation:
    "Dieses Dokument prüft, wie gut Ihr Angebot reale Kundenbedarfe trifft, auf Basis von Tests und Rückmeldungen. Es liefert Evidenz für Produkt-Markt-Fit und Prioritäten in der Weiterentwicklung.",
  process_optimization:
    "Dieses Dokument analysiert bestehende Prozesse hinsichtlich Effizienz, Qualität und Aufwand. Es zeigt konkrete Optimierungsansätze mit messbarer Wirkung auf Ablauf und Ergebnis.",
  strategic_options:
    "Dieses Dokument beschreibt alternative strategische Handlungswege mit Vorteilen, Nachteilen und Voraussetzungen. Es dient der strukturierten Auswahl einer tragfähigen Stoßrichtung.",
  hr_planning:
    "Dieses Dokument plant Personalbedarf, Rollenprofile und zeitliche Prioritäten entlang Ihrer Unternehmensziele. Es unterstützt eine realistische Kapazitäts- und Teamplanung.",
  value_proposition:
    "Dieses Dokument schärft Ihr Wertversprechen: welches Kundenproblem gelöst wird, für wen der Nutzen entsteht und wodurch Sie sich differenzieren. Es bildet die Grundlage für Positionierung und Kommunikation.",
  go_to_market:
    "Dieses Dokument definiert Ihren Markteintrittsplan mit Zielsegmenten, Kanälen, Angebotslogik und ersten Umsetzungsmaßnahmen. Es dient als Leitlinie für den operativen Start im Markt.",
  marketing_strategy:
    "Dieses Dokument beschreibt Marketingziele, Kernbotschaften, Zielgruppenansprache und priorisierte Maßnahmen. Es unterstützt eine wirksame und konsistente Marktbearbeitung.",
  scaling_strategy:
    "Dieses Dokument zeigt, wie Wachstum strukturiert umgesetzt werden kann, inklusive Voraussetzungen, Engpässen und Prioritäten. Es hilft, Skalierung kontrolliert und ressourcenschonend zu gestalten.",
  growth_margin_optimization:
    "Dieses Dokument fasst Situation, Deckungsbeitrag pro Angebotslinie, Angebots- und Kommunikationslogik sowie Kostentreiber zusammen. Es unterstützt gezielte Hebel für mehr Absatz oder bessere Preise und zeigt Einsparpotenziale – ergänzt um eine Branchen-Checkliste, wenn Zahlen noch fehlen.",
  portfolio_management:
    "Dieses Dokument bewertet mehrere Produkte oder Geschäftsfelder anhand von Leistung, Potenzial und Ressourcenbedarf. Es unterstützt Entscheidungen zu Fokus, Ausbau oder Reduktion einzelner Portfolioteile.",
  scenario_analysis:
    "Dieses Dokument vergleicht mehrere Zukunftsszenarien mit unterschiedlichen Annahmen und Auswirkungen. Es macht sichtbar, wie robust Ihre Entscheidungen unter verschiedenen Entwicklungen sind.",
  operative_plan:
    "Dieses Dokument übersetzt strategische Ziele in konkrete Aufgaben, Verantwortlichkeiten, Fristen und Meilensteine. Es schafft Verbindlichkeit für die operative Umsetzung.",
  swot_analysis:
    "Dieses Dokument strukturiert interne Stärken und Schwächen sowie externe Chancen und Risiken. Es liefert ein klares Lagebild für strategische Priorisierung.",
  financial_planning:
    "Dieses Dokument stellt die finanzielle Planung mit Erlösen, Kosten, Liquidität und Kapitalbedarf dar. Es unterstützt wirtschaftliche Steuerung und frühzeitige Erkennung finanzieller Engpässe.",
  personnel_plan:
    "Dieses Dokument konkretisiert Teamstruktur, Rollenanforderungen und Personalaufwand in der Zeitachse. Es dient als Grundlage für eine tragfähige Ressourcenplanung.",
  strategic_planning:
    "Dieses Dokument beschreibt die langfristige Zielrichtung sowie die zentralen strategischen Initiativen zur Zielerreichung. Es stellt sicher, dass Einzelmaßnahmen auf eine gemeinsame Richtung einzahlen.",
  trend_analysis:
    "Dieses Dokument analysiert relevante Markt-, Technologie- und Umfeldtrends und deren mögliche Auswirkungen auf Ihr Geschäft. Es unterstützt proaktive strategische Anpassungen.",
  competitor_analysis:
    "Dieses Dokument vergleicht Wettbewerber hinsichtlich Angebot, Positionierung und Leistungsfähigkeit. Es zeigt Differenzierungspotenziale und mögliche Wettbewerbsrisiken auf.",
  kpi_estimation:
    "Dieses Dokument liefert begründete Schätzwerte für zentrale Kennzahlen, wenn noch keine vollständigen Ist-Daten vorliegen. Es ermöglicht belastbare Orientierung für Planung und Priorisierung.",
  work_processes:
    "Dieses Dokument beschreibt End-to-End-Abläufe inklusive Schnittstellen, Verantwortlichkeiten und Prozesslogik. Es schafft Transparenz für Steuerung, Übergaben und Qualitätskontrolle.",
  tech_digitalization:
    "Dieses Dokument bewertet Digitalisierungs- und Technologieoptionen im Hinblick auf Nutzen, Aufwand und Umsetzungsvoraussetzungen. Es unterstützt die Auswahl sinnvoller Technologiestufen.",
  automation_roi:
    "Dieses Dokument bewertet den wirtschaftlichen Nutzen geplanter Automatisierung anhand Kosten, Einsparpotenzial und Amortisationszeit. Es dient als Investitionsgrundlage für Automatisierungsentscheidungen.",
  physical_automation:
    "Dieses Dokument beschreibt Möglichkeiten physischer Automatisierung, z. B. durch Maschinen oder technische Assistenzsysteme. Es bewertet Nutzen, Integrationsaufwand und operative Auswirkungen.",
  inventory_equipment_plan:
    "Dieses Dokument bündelt Inventar (Geräte und Material), Abgleich mit Prozessen und Unternehmensform, empfohlene Anschaffungen für die Markteintrittsphase mit Richtpreisen und Referenzlinks sowie eine spätere Effizienz- und Skalierungsperspektive.",
  app_project_plan:
    "Dieses Dokument strukturiert ein App-Vorhaben nach Umfang, Arbeitspaketen, Phasen und Steuerungslogik. Es schafft Klarheit über Vorgehen, Prioritäten und Umsetzungspfad.",
  app_requirements:
    "Dieses Dokument definiert funktionale und fachliche Anforderungen aus Nutzer- und Geschäftssicht. Es legt fest, welche Fähigkeiten die App liefern muss.",
  app_tech_spec:
    "Dieses Dokument beschreibt die technische Architektur, Systemkomponenten, Schnittstellen und Integrationspunkte der App. Es dient als technische Umsetzungsgrundlage.",
  app_mvp_guide:
    "Dieses Dokument priorisiert den minimal notwendigen Funktionsumfang für eine erste marktfähige Version (MVP). Es fokussiert auf schnelles Lernen bei begrenztem Umsetzungsaufwand.",
  app_page_specs:
    "Dieses Dokument spezifiziert Seiten und Nutzerinteraktionen inklusive Inhalte, Aktionen und Navigationslogik. Es unterstützt eine konsistente UX-Umsetzung.",
  app_db_schema:
    "Dieses Dokument beschreibt Datenobjekte, Beziehungen und Strukturregeln der Datenhaltung. Es ist die Grundlage für konsistente Datenspeicherung und nachvollziehbare Systemlogik.",
};

const FALLBACK =
  "Dieses Dokument enthält die aufbereitete Ergebnisdarstellung eines Prozessschritts und dient als nachvollziehbare Grundlage für die weitere Analyse und Entscheidung.";

export function getArtifactDocumentIntroDe(artifactType: string): string {
  return INTROS[artifactType] ?? FALLBACK;
}
