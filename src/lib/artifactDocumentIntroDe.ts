/**
 * Sehr kurze Erklärung für die Infobox „Was dieses Dokument zeigt“ — für Menschen,
 * die den Dokumenttyp noch nicht kennen (einfache Sprache, wenig Fachjargon).
 */
const INTROS: Record<string, string> = {
  baseline:
    "Startpunkt mit Zahlen und Annahmen zu eurem Betrieb. So könnt ihr später vergleichen, ob sich etwas verbessert hat.",
  industry_research:
    "Was in eurer Branche gerade üblich ist: grobe Marktlage, Trends und Rahmen — damit ihr euch darin zurechtfindet.",
  market:
    "Wer könnte eure Kunden sein, wer macht ähnliches wie ihr, und wo gibt es Chancen — in groben Strichen erklärt.",
  market_research:
    "Mehr zum Markt: Nachfrage, Preise und typische Wege zum Kunden. Gedacht zum Lesen, nicht zum Staunen mit Fachbegriffen.",
  diagnostic:
    "Schaut, wo es bei euch hakt: Abläufe, Engpässe und Stellen, an denen ihr etwas verbessern könnt.",
  decision_pack:
    "Hilft bei einer Entscheidung: welche Möglichkeiten es gibt, woran man sie messen kann und was dafür spricht.",
  data_collection_plan:
    "Ein Plan, welche Zahlen ihr sammeln solltet und warum — damit ihr später sauber auswerten könnt.",
  knowledge_digest:
    "Die wichtigsten Infos aus eurer Wissensbasis, kurz zusammengefasst.",
  strategy_pack:
    "Verschiedene strategische Bausteine an einem Ort — zum Durchlesen und Priorisieren.",
  best_practices:
    "Was andere in ähnlichen Fällen oft gut machen — als Ideensammlung, nicht als Gesetz.",
  failure_analysis:
    "Was schiefgehen kann und warum — damit ihr Fallstricke früh seht.",
  business_plan:
    "Wie euer Geschäft gedacht ist: Idee, Zahlen grob, nächste Schritte. Gut zum Teilen mit anderen.",
  menu_card:
    "Eure Speisen oder Angebote übersichtlich — für Gäste oder interne Planung.",
  supplier_list:
    "Woher ihr was bezieht — Lieferanten und Stoffe auf einen Blick.",
  menu_cost:
    "Was eure Speisen ungefähr kosten — wichtig für Preise und Marge.",
  menu_preiskalkulation:
    "Wie sich Verkaufspreise aus den Kosten ergeben — damit ihr nicht zu knapp kalkuliert.",
  real_estate:
    "Zu Immobilien oder Standorten: Optionen, grobe Preise, was dazu passt.",
  startup_guide:
    "Schritte und Hinweise für den Start — was oft als Nächstes ansteht.",
  customer_validation:
    "Ob echte Kunden eure Idee wollen: Tests, Feedback und erste Signale — ohne Fachchinesisch.",
  process_optimization:
    "Wo Abläufe zu langsam oder teuer sind und was ihr dagegen tun könnt.",
  strategic_options:
    "Verschiedene Wege, die ihr einschlagen könnt — mit Vor- und Nachteilen in Kurzform.",
  hr_planning:
    "Wie viele Leute ihr braucht, welche Rollen und was das ungefähr bedeutet.",
  value_proposition:
    "In einfachen Worten: Welches Problem löst ihr? Für wen? Was macht euch anders als andere? Was wäre sinnvoll als Nächstes?",
  go_to_market:
    "Wie ihr Kunden erreicht: Kanäle, Preise grob, erste Schritte Richtung Markt.",
  marketing_strategy:
    "Was ihr in den nächsten Wochen werblich tun könnt — Ziel, Botschaft und konkrete Ideen.",
  scaling_strategy:
    "Wenn ihr wachsen wollt: woran es hängt, was zuerst dran ist und worauf ihr achten solltet.",
  portfolio_management:
    "Wenn ihr mehrere Produkte oder Bereiche habt: was gut läuft, was weniger, was Priorität hat.",
  scenario_analysis:
    "Was passiert, wenn die Dinge gut, mittel oder schlecht laufen — grob durchgerechnet.",
  operative_plan:
    "Wer macht was und bis wann — Alltag und nächste Meilensteine.",
  swot_analysis:
    "Vier Kästen: Was ihr gut könnt, wo ihr schwach seid, welche Chancen es gibt und was von außen drückt.",
  financial_planning:
    "Geld grob im Blick: Einnahmen, Ausgaben, was ihr braucht und wo es eng werden könnte.",
  personnel_plan:
    "Personal: wer gebraucht wird, Kosten grob, wie das Team aussehen könnte.",
  strategic_planning:
    "Wo ihr hinwollt über längere Zeit und welche großen Schritte dazugehören.",
  trend_analysis:
    "Was sich am Markt oder in der Technik bewegt — und was das für euch heißen könnte.",
  competitor_analysis:
    "Wer sonst noch da ist, was die können und wo ihr euch abheben könnt.",
  kpi_estimation:
    "Schätzungen zu wichtigen Kennzahlen — damit ihr Größenordnungen im Kopf habt.",
  work_processes:
    "Wie eure Arbeit von Anfang bis Ende läuft — Schritt für Schritt, inklusive wer wofür zuständig ist.",
  tech_digitalization:
    "Welche Software oder Digitalisierung Sinn machen könnte und was das bringt.",
  automation_roi:
    "Ob sich Automatisierung lohnt: Kosten, Einsparung, grobe Amortisation.",
  physical_automation:
    "Maschinen oder technische Hilfen: was sie kosten und was sie bringen sollen.",
  app_project_plan:
    "Plan für eine App: Umfang, Phasen und wie das Projekt organisiert werden kann.",
  app_requirements:
    "Was die App können soll — aus Nutzersicht, ohne Programmierdetails.",
  app_tech_spec:
    "Technische Seite der App: wie sie aufgebaut ist und mit was sie redet.",
  app_mvp_guide:
    "Die kleinste sinnvolle Version eurer App: was zuerst rein muss, um zu lernen.",
  app_page_specs:
    "Welche Bildschirme es gibt und was der Nutzer dort sieht und tun kann.",
  app_db_schema:
    "Welche Daten gespeichert werden und wie sie zusammenhängen — für Entwicklung und Nachvollziehbarkeit.",
};

const FALLBACK =
  "Kurzfassung von Ergebnissen aus eurem KI-gestützten Ablauf. Unten steht der Bericht zum Lesen; „PDF herunterladen“ speichert das für andere.";

export function getArtifactDocumentIntroDe(artifactType: string): string {
  return INTROS[artifactType] ?? FALLBACK;
}
