import { promptTemplates, type PromptTemplate } from "@/prompts/registry";

type Replacement = { from: string; to: string };

const COMMON_REPLACEMENTS: Replacement[] = [
  { from: "Return ONLY valid JSON, no prose.", to: "Gib NUR gültiges JSON zurück, keinen Fließtext." },
  { from: "CONTEXT_JSON:", to: "KONTEXT_JSON:" },
  { from: "Output schema:", to: "Ausgabe-Schema:" },
  { from: "CRITICAL", to: "KRITISCH" },
  { from: "MANDATORY", to: "VERPFLICHTEND" },
  { from: "IMPORTANT", to: "WICHTIG" },
  { from: "Use ", to: "Verwende " },
  { from: "Do not invent", to: "Erfinde nicht" },
  { from: "Do NOT invent", to: "Erfinde KEINE" },
  { from: "Adapt to company_profile.industry", to: "Passe an company_profile.industry an" },
  { from: "for this business", to: "für dieses Unternehmen" },
  { from: "for this step", to: "für diesen Schritt" },
  { from: "for year 1", to: "für Jahr 1" },
  { from: "for the first year of operations", to: "für das erste Betriebsjahr" },
  { from: "sources_used", to: "sources_used" },
  {
    from: "SOURCE REFERENCES (footnotes):",
    to: "QUELLENVERWEISE (Fußnoten):",
  },
  {
    from: "In narrative text, facts, descriptions: use ONLY [1], [2], [3] etc. to reference sources. Do NOT put full URLs or source names inline.",
    to: "In Fließtext, Fakten und Beschreibungen: nutze NUR [1], [2], [3] usw. als Quellenverweis. Setze KEINE vollen URLs oder Quellnamen direkt in den Satz.",
  },
  {
    from: 'Put all sources in sources_used as array of strings. Each entry: "Title (URL)" if URL exists, else "Title". Order matches [1], [2], [3].',
    to: 'Führe alle Quellen in sources_used als String-Array auf. Jeder Eintrag: "Titel (URL)" falls URL vorhanden, sonst "Titel". Reihenfolge entspricht [1], [2], [3].',
  },
  {
    from:
      'Put all sources in sources_used as array of strings. Each entry MUST include a working https URL in parentheses whenever the source is web-based: "Short title (https://example.com/path)". Order matches [1], [2], [3]. Omit URLs only for non-web sources (e.g. internal context); then use a clear label without fake links.',
    to:
      'Führe alle Quellen in sources_used als String-Array auf. Jeder Eintrag zu einer Web-Quelle MUSS eine funktionierende https-URL in Klammern enthalten: "Kurztitel (https://example.com/path)". Reihenfolge wie [1], [2], [3]. URLs nur weglassen bei rein internen Kontextquellen; dann klare Bezeichnung ohne erfundene Links.',
  },
  {
    from:
      "OUTPUT LANGUAGE: Write all narrative string values in German (clear business German). Keep JSON property names exactly as in the schema (English snake_case).\nSOURCES (mandatory): Include \"sources_used\" as a non-empty array. Every item that refers to a public/web source MUST be \"Kurztitel oder Quelle (https://vollständige-url)\" with a valid https URL. Use footnotes [1], [2] in text fields only — never paste raw URLs into problem_statement, bullets, or recommendations.",
    to:
      "AUSGABESPRACHE: Schreibe alle Textinhalte in den String-Feldern auf Deutsch (klares Business-Deutsch). Die JSON-Feldnamen bleiben exakt wie im Schema (englisch, snake_case).\nQUELLEN (verpflichtend): Führe sources_used als nicht-leeres Array. Jeder Eintrag zu einer öffentlichen/Web-Quelle MUSS die Form \"Kurztitel (https://vollständige-url)\" mit gültiger https-URL haben. Nutze im Text nur [1], [2]; keine nackten URLs in problem_statement, Aufzählungen oder Empfehlungen.",
  },
  {
    from: 'For key_facts: use source_ref (number 1-based) instead of source_hint. Example: { "fact": "...", "source_ref": 1 }',
    to: 'Für key_facts: nutze source_ref (1-basiert) statt source_hint. Beispiel: { "fact": "...", "source_ref": 1 }',
  },
  {
    from: "REFERENCED ARTIFACTS: CONTEXT_JSON includes typed fields (e.g. market_snapshot, industry_research, business_plan) and may include \"related_analysis_outputs\": array of { artifact_type, title, content } with full JSON from other analyses. Use that data when present — do not invent. Ignore empty arrays/null fields.",
    to: "REFERENZIERTE ARTEFAKTE: KONTEXT_JSON enthält typisierte Felder (z. B. market_snapshot, industry_research, business_plan) und ggf. \"related_analysis_outputs\": Array aus { artifact_type, title, content } mit vollständigem JSON früherer Analysen. Nutze diese Daten wenn vorhanden — nichts erfinden. Leere Arrays/null-Felder ignorieren.",
  },
  {
    from: "CRITICAL – Output MUST be valid, parseable JSON:",
    to: "KRITISCH - Die Ausgabe MUSS gültiges, parsebares JSON sein:",
  },
  {
    from: 'Escape quotes inside strings: use \\" (e.g. "als \\"anders\\" kann" – never raw " inside string values)',
    to: 'Anführungszeichen innerhalb von Strings escapen: nutze \\" (z. B. "als \\"anders\\" kann") - niemals rohe " innerhalb von Stringwerten',
  },
  { from: "No trailing commas after last array/object element", to: "Keine abschließenden Kommas nach dem letzten Array-/Objekt-Element" },
  { from: "No newlines inside string values (use \\n for line breaks)", to: "Keine Zeilenumbrüche in Stringwerten (nutze \\n für Umbrüche)" },
  { from: "Use commas (,) between properties, never periods (.)", to: "Nutze Kommas (,) zwischen Properties, niemals Punkte (.)" },
  { from: "No comments (no // or /* */)", to: "Keine Kommentare (kein // oder /* */)" },
  { from: "Every key must have a value (key: value)", to: "Jeder Key muss einen Wert haben (key: value)" },
];

const ROLE_REPLACEMENTS: Replacement[] = [
  { from: "You are ", to: "Du bist " },
  { from: "expert", to: "Experte" },
  { from: "analyst", to: "Analyst" },
  { from: "consultant", to: "Berater" },
  { from: "strategist", to: "Stratege" },
  { from: "architect", to: "Architekt" },
  { from: "writer", to: "Autor" },
];

function applyReplacements(input: string, replacements: Replacement[]): string {
  return replacements.reduce((text, rep) => text.split(rep.from).join(rep.to), input);
}

function toGermanTemplateText(templateText: string): string {
  // 1) global/common translations for repeated guidance blocks
  const common = applyReplacements(templateText, COMMON_REPLACEMENTS);
  // 2) tone/role translation for opening lines
  return applyReplacements(common, ROLE_REPLACEMENTS);
}

export const promptTemplatesDe: PromptTemplate[] = promptTemplates.map((tpl) => ({
  ...tpl,
  templateText: toGermanTemplateText(tpl.templateText),
}));
