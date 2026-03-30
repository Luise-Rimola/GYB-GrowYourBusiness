import { promptTemplates, type PromptTemplate } from "@/prompts/registry";

type Replacement = { from: string; to: string };

const COMMON_REPLACEMENTS: Replacement[] = [
  { from: "Return ONLY valid JSON, no prose.", to: "Gib NUR gueltiges JSON zurueck, keinen Fliesstext." },
  { from: "CONTEXT_JSON:", to: "KONTEXT_JSON:" },
  { from: "Output schema:", to: "Ausgabe-Schema:" },
  { from: "CRITICAL", to: "KRITISCH" },
  { from: "MANDATORY", to: "VERPFLICHTEND" },
  { from: "IMPORTANT", to: "WICHTIG" },
  { from: "Use ", to: "Verwende " },
  { from: "Do not invent", to: "Erfinde nicht" },
  { from: "Do NOT invent", to: "Erfinde KEINE" },
  { from: "Adapt to company_profile.industry", to: "Passe an company_profile.industry an" },
  { from: "for this business", to: "fuer dieses Unternehmen" },
  { from: "for this step", to: "fuer diesen Schritt" },
  { from: "for year 1", to: "fuer Jahr 1" },
  { from: "for the first year of operations", to: "fuer das erste Betriebsjahr" },
  { from: "sources_used", to: "sources_used" },
  {
    from: "SOURCE REFERENCES (footnotes):",
    to: "QUELLENVERWEISE (Fussnoten):",
  },
  {
    from: "In narrative text, facts, descriptions: use ONLY [1], [2], [3] etc. to reference sources. Do NOT put full URLs or source names inline.",
    to: "In Fliesstext, Fakten und Beschreibungen: nutze NUR [1], [2], [3] usw. als Quellenverweis. Setze KEINE vollen URLs oder Quellnamen direkt in den Satz.",
  },
  {
    from: 'Put all sources in sources_used as array of strings. Each entry: "Title (URL)" if URL exists, else "Title". Order matches [1], [2], [3].',
    to: 'Fuehre alle Quellen in sources_used als String-Array auf. Jeder Eintrag: "Titel (URL)" falls URL vorhanden, sonst "Titel". Reihenfolge entspricht [1], [2], [3].',
  },
  {
    from: 'For key_facts: use source_ref (number 1-based) instead of source_hint. Example: { "fact": "...", "source_ref": 1 }',
    to: 'Fuer key_facts: nutze source_ref (1-basiert) statt source_hint. Beispiel: { "fact": "...", "source_ref": 1 }',
  },
  {
    from: "REFERENCED ARTIFACTS: CONTEXT_JSON contains the full outputs of previous workflows (real_estate, financial_planning, supplier_list, menu_card, menu_cost, market_snapshot, industry_research, best_practices, failure_analysis, etc.). When present, use their ACTUAL data – do not invent or estimate. The workflows ran before this step; use the results directly.",
    to: "REFERENZIERTE ARTEFAKTE: KONTEXT_JSON enthaelt die vollstaendigen Ergebnisse vorheriger Workflows (real_estate, financial_planning, supplier_list, menu_card, menu_cost, market_snapshot, industry_research, best_practices, failure_analysis usw.). Wenn vorhanden, nutze deren TATSAECHLICHE Daten - nicht erfinden und nicht schaetzen. Diese Workflows liefen bereits vor diesem Schritt; nutze die Ergebnisse direkt.",
  },
  {
    from: "CRITICAL – Output MUST be valid, parseable JSON:",
    to: "KRITISCH - Die Ausgabe MUSS gueltiges, parsebares JSON sein:",
  },
  {
    from: 'Escape quotes inside strings: use \\" (e.g. "als \\"anders\\" kann" – never raw " inside string values)',
    to: 'Anfuehrungszeichen innerhalb von Strings escapen: nutze \\" (z. B. "als \\"anders\\" kann") - niemals rohe " innerhalb von Stringwerten',
  },
  { from: "No trailing commas after last array/object element", to: "Keine abschliessenden Kommas nach dem letzten Array-/Objekt-Element" },
  { from: "No newlines inside string values (use \\n for line breaks)", to: "Keine Zeilenumbrueche in Stringwerten (nutze \\n fuer Umbrueche)" },
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
