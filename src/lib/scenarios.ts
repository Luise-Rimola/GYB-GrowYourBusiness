/**
 * 100 Use-Case-Szenarien für die Evaluierung.
 * Flow: User antwortet + Konfidenz → KI antwortet mit Quellen + Konfidenz → User vergleicht, wählt, bewertet KI-Konfidenz.
 */
export type ScenarioCategory =
  | "markt_geschaeftsmodell"
  | "produktstrategie"
  | "marketing"
  | "wachstum_expansion"
  | "investition_strategie";

export type Scenario = {
  id: number;
  category: ScenarioCategory;
  question: string;
  kpis: string[];
};

export const SCENARIO_CATEGORIES: Record<ScenarioCategory, string> = {
  markt_geschaeftsmodell: "Markt & Geschäftsmodell",
  produktstrategie: "Produktstrategie",
  marketing: "Marketing",
  wachstum_expansion: "Wachstum & Expansion",
  investition_strategie: "Investition & Strategie",
};

export const SCENARIOS: Scenario[] = [
  // 1–20 Markt & Geschäftsmodell
  { id: 1, category: "markt_geschaeftsmodell", question: "Kann die Geschäftsidee profitabel sein?", kpis: ["erwarteter Umsatz", "Gewinnmarge", "Break-even-Monate", "Marktanteil", "ROI"] },
  { id: 2, category: "markt_geschaeftsmodell", question: "Welches Kundensegment sollte primär adressiert werden?", kpis: ["Customer Lifetime Value", "CAC", "Conversion Rate", "Marktvolumen", "Umsatzpotenzial"] },
  { id: 3, category: "markt_geschaeftsmodell", question: "Ist der Markt groß genug für ein skalierbares Unternehmen?", kpis: ["TAM", "SAM", "SOM", "erwarteter Umsatzanteil", "Marktpenetration"] },
  { id: 4, category: "markt_geschaeftsmodell", question: "Welches Problem sollte im MVP priorisiert werden?", kpis: ["erwartete Nutzerakzeptanz", "Conversion Rate", "Produktnutzungsrate"] },
  { id: 5, category: "markt_geschaeftsmodell", question: "Welche Value Proposition differenziert am stärksten vom Wettbewerb?", kpis: ["Marktanteilswachstum", "Customer Acquisition Rate", "Preisprämie"] },
  { id: 6, category: "markt_geschaeftsmodell", question: "Soll das Unternehmen lokal oder international starten?", kpis: ["Markteintrittskosten", "Umsatzpotenzial", "CAC", "Marktwachstum"] },
  { id: 7, category: "markt_geschaeftsmodell", question: "Welcher Markt bietet das beste Verhältnis aus Nachfrage und Wettbewerb?", kpis: ["Wettbewerbsdichte", "Nachfrageindex", "Marktanteilspotenzial"] },
  { id: 8, category: "markt_geschaeftsmodell", question: "Soll das Unternehmen B2B oder B2C verfolgen?", kpis: ["durchschnittlicher Umsatz pro Kunde", "CLV", "CAC", "Churn Rate"] },
  { id: 9, category: "markt_geschaeftsmodell", question: "Welches Marktsegment hat die höchste Zahlungsbereitschaft?", kpis: ["durchschnittlicher Verkaufspreis", "Umsatzpotenzial", "Conversion Rate"] },
  { id: 10, category: "markt_geschaeftsmodell", question: "Ist das Geschäftsmodell langfristig skalierbar?", kpis: ["Umsatzwachstum", "Skalierungskosten", "operative Marge"] },
  { id: 11, category: "markt_geschaeftsmodell", question: "Soll das Unternehmen eine Nischenstrategie verfolgen?", kpis: ["Marktanteil im Segment", "Umsatz pro Kunde", "Wettbewerb"] },
  { id: 12, category: "markt_geschaeftsmodell", question: "Welche Kundengruppe hat den höchsten CLV?", kpis: ["Customer Lifetime Value", "Retention Rate", "Upsell Rate"] },
  { id: 13, category: "markt_geschaeftsmodell", question: "Welches Marktsegment bietet das größte Wachstumspotenzial?", kpis: ["Marktwachstum", "erwarteter Umsatz", "Marktanteil"] },
  { id: 14, category: "markt_geschaeftsmodell", question: "Welche Wettbewerbsstrategie ist sinnvoll?", kpis: ["Preisniveau", "Marktanteilsentwicklung", "Gewinnmarge"] },
  { id: 15, category: "markt_geschaeftsmodell", question: "Welche Region bietet den besten Markteintritt?", kpis: ["Marktgröße", "Wettbewerbsintensität", "Markteintrittskosten"] },
  { id: 16, category: "markt_geschaeftsmodell", question: "Soll das Produkt auf Early Adopters ausgerichtet werden?", kpis: ["Adoptionsrate", "Kundenwachstum", "Feedbackrate"] },
  { id: 17, category: "markt_geschaeftsmodell", question: "Welches Kundenproblem sollte zuerst validiert werden?", kpis: ["Nachfrageintensität", "Conversion Rate", "Kundeninteresse"] },
  { id: 18, category: "markt_geschaeftsmodell", question: "Welche Kundengruppe hat den höchsten Umsatz pro Kunde?", kpis: ["Average Revenue per User (ARPU)", "CLV"] },
  { id: 19, category: "markt_geschaeftsmodell", question: "Welche Marktposition sollte angestrebt werden?", kpis: ["Marktanteil", "Preisniveau", "Wettbewerbsindex"] },
  { id: 20, category: "markt_geschaeftsmodell", question: "Welche Markteintrittsbarrieren könnten Erfolg verhindern?", kpis: ["Eintrittskosten", "Time-to-Market", "regulatorische Risiken"] },
  // 21–40 Produktstrategie
  { id: 21, category: "produktstrategie", question: "Welche Features sollten im MVP enthalten sein?", kpis: ["Nutzeraktivität", "Conversion Rate", "Produktakzeptanz"] },
  { id: 22, category: "produktstrategie", question: "Welche Produktfunktion erzeugt den größten Kundennutzen?", kpis: ["Nutzungsrate", "Feature Adoption", "Kundenfeedbackscore"] },
  { id: 23, category: "produktstrategie", question: "Soll das Produkt jetzt gelauncht werden?", kpis: ["Launch-Umsatz", "Adoption Rate", "Kundenwachstum"] },
  { id: 24, category: "produktstrategie", question: "Welche Features sollten priorisiert werden?", kpis: ["Feature-Nutzung", "Umsatzimpact", "Kundenzufriedenheit"] },
  { id: 25, category: "produktstrategie", question: "Welche Features können gestrichen werden?", kpis: ["Entwicklungskostenersparnis", "Produktkomplexität"] },
  { id: 26, category: "produktstrategie", question: "Soll Qualität oder Geschwindigkeit priorisiert werden?", kpis: ["Time-to-Market", "Produktfehlerquote", "Kundenzufriedenheit"] },
  { id: 27, category: "produktstrategie", question: "Welche Produktstrategie bietet Wettbewerbsvorteile?", kpis: ["Marktanteilswachstum", "Kundenakquise"] },
  { id: 28, category: "produktstrategie", question: "Soll das Produkt modular entwickelt werden?", kpis: ["Entwicklungskosten", "Time-to-Market", "Skalierbarkeit"] },
  { id: 29, category: "produktstrategie", question: "Welche Funktion erhöht Kundenbindung?", kpis: ["Retention Rate", "Nutzungsfrequenz"] },
  { id: 30, category: "produktstrategie", question: "Welche Produktversion sollte veröffentlicht werden?", kpis: ["Adoption Rate", "Launch-Umsatz"] },
  { id: 31, category: "produktstrategie", question: "Welche Feature-Kombination maximiert Kundennutzen?", kpis: ["Nutzerzufriedenheit", "Conversion Rate"] },
  { id: 32, category: "produktstrategie", question: "Soll das Produkt als Plattform entwickelt werden?", kpis: ["Nutzerwachstum", "Plattformtransaktionen"] },
  { id: 33, category: "produktstrategie", question: "Welche Innovation hat den größten Marktimpact?", kpis: ["Marktanteilswachstum", "Umsatzsteigerung"] },
  { id: 34, category: "produktstrategie", question: "Welche Funktion rechtfertigt den höchsten Preis?", kpis: ["Zahlungsbereitschaft", "Preiselastizität"] },
  { id: 35, category: "produktstrategie", question: "Premium oder Massenprodukt?", kpis: ["Gewinnmarge", "Umsatzvolumen"] },
  { id: 36, category: "produktstrategie", question: "Welche Funktionen sollten zuerst getestet werden?", kpis: ["Nutzerfeedback", "Testconversion"] },
  { id: 37, category: "produktstrategie", question: "Welche Features bieten Wettbewerbsvorteile?", kpis: ["Marktanteil", "Kundenzufriedenheit"] },
  { id: 38, category: "produktstrategie", question: "Welche Produktstrategie maximiert Wachstum?", kpis: ["Umsatzwachstum", "Nutzerwachstum"] },
  { id: 39, category: "produktstrategie", question: "Welche Funktionen gehören ins nächste Release?", kpis: ["Feature Adoption", "Kundenfeedback"] },
  { id: 40, category: "produktstrategie", question: "Welche Produktstrategie minimiert Entwicklungsrisiken?", kpis: ["Entwicklungsdauer", "Kostenüberschreitung"] },
  // 41–60 Marketing
  { id: 41, category: "marketing", question: "Welche Marketingkanäle sollten priorisiert werden?", kpis: ["CAC", "Conversion Rate", "Leadkosten"] },
  { id: 42, category: "marketing", question: "Welche Marketingstrategie maximiert Akquise bei begrenztem Budget?", kpis: ["Marketing ROI", "Leads", "CAC"] },
  { id: 43, category: "marketing", question: "Welche Marketingmaßnahmen liefern den höchsten ROI?", kpis: ["Marketing ROI", "Umsatzbeitrag"] },
  { id: 44, category: "marketing", question: "Welche Zielgruppe sollte zuerst angesprochen werden?", kpis: ["Conversion Rate", "CLV"] },
  { id: 45, category: "marketing", question: "Welche Kommunikationsstrategie wirkt am besten?", kpis: ["Engagement Rate", "Conversion Rate"] },
  { id: 46, category: "marketing", question: "Welche Marketingbotschaft differenziert am stärksten?", kpis: ["Click-Through-Rate", "Markenbekanntheit"] },
  { id: 47, category: "marketing", question: "Branding oder Performance Marketing?", kpis: ["Markenbekanntheit", "CAC"] },
  { id: 48, category: "marketing", question: "Welche Kanäle bieten Wachstumspotenzial?", kpis: ["Leadwachstum", "CAC"] },
  { id: 49, category: "marketing", question: "Welche Strategie erhöht Conversion?", kpis: ["Conversion Rate", "Umsatz pro Besucher"] },
  { id: 50, category: "marketing", question: "Welche Marketingkanäle sind skalierbar?", kpis: ["Marketing ROI", "Umsatzwachstum"] },
  { id: 51, category: "marketing", question: "Welche Kampagne zuerst umsetzen?", kpis: ["Kampagnen-ROI", "Leads"] },
  { id: 52, category: "marketing", question: "Welche Strategie maximiert Vertrauen?", kpis: ["Trust Score", "Conversion Rate"] },
  { id: 53, category: "marketing", question: "Welche Kanäle sind kosteneffizient?", kpis: ["CAC", "Marketing ROI"] },
  { id: 54, category: "marketing", question: "Welche Strategie generiert qualifizierte Leads?", kpis: ["Lead Quality Score"] },
  { id: 55, category: "marketing", question: "Welche Marketingstrategie eignet sich für Markteintritt?", kpis: ["Marktpenetration", "CAC"] },
  { id: 56, category: "marketing", question: "Welche Contentstrategie steigert Markenbekanntheit?", kpis: ["Reichweite", "Engagement"] },
  { id: 57, category: "marketing", question: "Welche Strategie unterstützt Wachstum?", kpis: ["Umsatzwachstum", "Leadwachstum"] },
  { id: 58, category: "marketing", question: "Welche Maßnahmen priorisieren?", kpis: ["ROI", "Conversion"] },
  { id: 59, category: "marketing", question: "Wie erreicht man Early Adopters?", kpis: ["Adoption Rate"] },
  { id: 60, category: "marketing", question: "Wie minimiert man Akquisitionskosten?", kpis: ["CAC", "Marketing ROI"] },
  // 61–80 Wachstum & Expansion
  { id: 61, category: "wachstum_expansion", question: "Welche Wachstumsstrategie sollte verfolgt werden?", kpis: ["Umsatzwachstum", "Marktanteil"] },
  { id: 62, category: "wachstum_expansion", question: "Soll das Unternehmen expandieren?", kpis: ["Umsatzpotenzial", "Expansionskosten"] },
  { id: 63, category: "wachstum_expansion", question: "Welcher Markt bietet Wachstum?", kpis: ["Marktgröße", "Nachfrage"] },
  { id: 64, category: "wachstum_expansion", question: "Welche Länder zuerst erschließen?", kpis: ["Marktanteilspotenzial", "Markteintrittskosten"] },
  { id: 65, category: "wachstum_expansion", question: "Welche Expansionsstrategie minimiert Risiko?", kpis: ["Investitionsrisiko", "ROI"] },
  { id: 66, category: "wachstum_expansion", question: "Organisches Wachstum oder Partnerschaften?", kpis: ["Umsatzwachstum", "Partnerkosten"] },
  { id: 67, category: "wachstum_expansion", question: "Welche Wachstumsmaßnahmen priorisieren?", kpis: ["Umsatzwachstum", "Marketing ROI"] },
  { id: 68, category: "wachstum_expansion", question: "Welche Strategie maximiert Marktanteile?", kpis: ["Marktanteil", "Kundenwachstum"] },
  { id: 69, category: "wachstum_expansion", question: "Welche Strategie ist finanziell tragfähig?", kpis: ["Cashflow", "ROI"] },
  { id: 70, category: "wachstum_expansion", question: "Welche Partnerschaften beschleunigen Wachstum?", kpis: ["Umsatzwachstum", "Partnerumsatz"] },
  { id: 71, category: "wachstum_expansion", question: "Welche Märkte haben höchste Nachfrage?", kpis: ["Marktgröße", "Nachfrageindex"] },
  { id: 72, category: "wachstum_expansion", question: "Welche Strategie maximiert Umsatzpotenzial?", kpis: ["Umsatzwachstum"] },
  { id: 73, category: "wachstum_expansion", question: "Welche Märkte vermeiden?", kpis: ["Risikoindex", "Wettbewerb"] },
  { id: 74, category: "wachstum_expansion", question: "Welche Strategie minimiert Wettbewerbsdruck?", kpis: ["Marktanteil", "Wettbewerbsdichte"] },
  { id: 75, category: "wachstum_expansion", question: "Welche Strategie ermöglicht Skalierung?", kpis: ["Skalierungskosten", "Umsatzwachstum"] },
  { id: 76, category: "wachstum_expansion", question: "Welche Märkte bieten beste Margen?", kpis: ["Gewinnmarge"] },
  { id: 77, category: "wachstum_expansion", question: "Welche Expansionsstrategie erhöht Marktanteil?", kpis: ["Marktanteil"] },
  { id: 78, category: "wachstum_expansion", question: "Welche Märkte bieten geringste Eintrittskosten?", kpis: ["Markteintrittskosten"] },
  { id: 79, category: "wachstum_expansion", question: "Welche Strategie erhöht Kundenwachstum?", kpis: ["Nutzerwachstum"] },
  { id: 80, category: "wachstum_expansion", question: "Welche Strategie maximiert Umsatz pro Markt?", kpis: ["Umsatz pro Region"] },
  // 81–100 Investition & Strategie
  { id: 81, category: "investition_strategie", question: "Soll in neue Technologie investiert werden?", kpis: ["ROI", "Effizienzsteigerung"] },
  { id: 82, category: "investition_strategie", question: "Welche Investition bietet höchsten ROI?", kpis: ["ROI", "Cashflow"] },
  { id: 83, category: "investition_strategie", question: "Welche Investition minimiert Risiko?", kpis: ["Risikoindex"] },
  { id: 84, category: "investition_strategie", question: "Welche Investitionen priorisieren?", kpis: ["ROI", "Kosten"] },
  { id: 85, category: "investition_strategie", question: "Welche Ressourcen ausbauen?", kpis: ["Produktivität"] },
  { id: 86, category: "investition_strategie", question: "Outsourcing oder intern entwickeln?", kpis: ["Kosten", "Effizienz"] },
  { id: 87, category: "investition_strategie", question: "Welche Investition steigert Produktivität?", kpis: ["Output pro Mitarbeiter"] },
  { id: 88, category: "investition_strategie", question: "Welche Investition unterstützt Wachstum?", kpis: ["Umsatzwachstum"] },
  { id: 89, category: "investition_strategie", question: "Soll Automatisierung eingeführt werden?", kpis: ["Kosteneinsparung"] },
  { id: 90, category: "investition_strategie", question: "Welche Investition stärkt Wettbewerbsfähigkeit?", kpis: ["Marktanteil"] },
  { id: 91, category: "investition_strategie", question: "Welche langfristige Strategie verfolgen?", kpis: ["Umsatzwachstum", "Marktanteil"] },
  { id: 92, category: "investition_strategie", question: "Neues Geschäftsfeld erschließen?", kpis: ["Umsatzpotenzial"] },
  { id: 93, category: "investition_strategie", question: "Welche strategischen Risiken bestehen?", kpis: ["Risikoindex"] },
  { id: 94, category: "investition_strategie", question: "Welche Strategie maximiert Wettbewerbsfähigkeit?", kpis: ["Marktanteil"] },
  { id: 95, category: "investition_strategie", question: "Partnerschaft eingehen?", kpis: ["Umsatzwachstum"] },
  { id: 96, category: "investition_strategie", question: "Welche Initiativen priorisieren?", kpis: ["ROI"] },
  { id: 97, category: "investition_strategie", question: "Welche Strategie sichert Profitabilität?", kpis: ["Gewinnmarge"] },
  { id: 98, category: "investition_strategie", question: "Welche Maßnahmen stärken Marktposition?", kpis: ["Marktanteil"] },
  { id: 99, category: "investition_strategie", question: "Welche Risiken bedrohen Geschäftsmodell?", kpis: ["Risikoindex"] },
  { id: 100, category: "investition_strategie", question: "Welche Strategie maximiert nachhaltiges Wachstum?", kpis: ["Umsatzwachstum", "Gewinnmarge", "Marktanteil"] },
];

export function getScenarioById(id: number): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getScenariosByCategory(category: ScenarioCategory): Scenario[] {
  return SCENARIOS.filter((s) => s.category === category);
}
