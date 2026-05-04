/**
 * Zuordnung Instrument → Variable/Kürzel → Forschungsfragen FF1–FF4 (Handbuch).
 * Jede Zeile = mindestens eine FF; mehrere Spalten markiert = Mehrfachzuordnung bewusst.
 */
import {
  CF_ITEMS,
  CL_ITEMS,
  COMP_ITEMS,
  DQ_ITEMS,
  EV_ITEMS,
  FIT_ITEMS,
  GOV_ITEMS,
  TAM_UTAUT_ITEMS,
  TR_ITEMS,
  US_ITEMS,
} from "@/lib/fragebogenScales";

export type FfId = "FF1" | "FF2" | "FF3" | "FF4";

export type EvaluationMapRow = {
  instrument: string;
  code: string;
  labelDe: string;
  labelEn: string;
  ff: readonly FfId[];
};

function row(
  instrument: string,
  code: string,
  labelDe: string,
  labelEn: string,
  ff: readonly FfId[],
): EvaluationMapRow {
  return { instrument, code, labelDe, labelEn, ff };
}

const FF3: FfId[] = ["FF3"];
const FF34: FfId[] = ["FF3", "FF4"];
const FF13: FfId[] = ["FF1", "FF3"];
const FF14: FfId[] = ["FF1", "FF4"];
const FF134: FfId[] = ["FF1", "FF3", "FF4"];
const FF12: FfId[] = ["FF1", "FF2"];
const FF123: FfId[] = ["FF1", "FF2", "FF3"];
const FF234: FfId[] = ["FF2", "FF3", "FF4"];
const FF2_ONLY: FfId[] = ["FF2"];
const FF4_ONLY: FfId[] = ["FF4"];

function pushScaleBlock(
  out: EvaluationMapRow[],
  form: "FB2" | "FB3" | "FB4",
  blockDe: string,
  blockEn: string,
  items: readonly { key: string }[],
  ff: readonly FfId[],
) {
  for (const { key } of items) {
    out.push(row(form, key, `Likert ${key} (${blockDe})`, `Likert ${key} (${blockEn})`, ff));
  }
}

function buildRows(): EvaluationMapRow[] {
  const out: EvaluationMapRow[] = [];

  // —— FB1 (Item-Keys wie Export / QuestionnaireResponseItem) ——
  const fb1a: [string, string, string][] = [
    ["A1", "Rolle / Kontext", "Role / context"],
    ["A2", "Unternehmensphase", "Company stage"],
    ["A3", "Teamgröße", "Team size"],
    ["A4", "Branche", "Industry"],
    ["A5", "Erfahrung (Jahre)", "Experience (years)"],
    ["A6", "Häufigkeit strategischer Entscheidungen", "Frequency of strategic decisions"],
  ];
  for (const [code, de, en] of fb1a) {
    out.push(row("FB1", code, `Freitext/Zahl ${code}: ${de}`, `Text/number ${code}: ${en}`, ["FF1"]));
  }
  out.push(row("FB1", "B1", "LLM/KI-Nutzung im Arbeitskontext", "LLM/AI use at work", FF14));
  out.push(row("FB1", "B2", "Selbsteingeschätzte KI-Kompetenz (1–7)", "Self-rated AI competence (1–7)", FF14));
  out.push(row("FB1", "B3", "Vertrauen in KI-Outputs (1–7)", "Trust in AI outputs (1–7)", FF34));
  const fb1c: [string, string][] = [
    ["C1", "Struktur & Begründung der Entscheidungen"],
    ["C2", "Nachvollziehbarkeit / Audit Trail"],
    ["C3", "Quellen-/ Datenbeleg"],
    ["C4", "Sicherheit in strategischen Entscheidungen"],
    ["C5", "Fehlende Informationen (reversed coding in Auswertung)"],
    ["C6", "Zeitaufwand bis tragfähiger Entscheidung"],
  ];
  for (const [code, de] of fb1c) {
    out.push(row("FB1", code, `Likert ${code}: ${de}`, `Likert ${code}: baseline decision process`, FF13));
  }
  out.push(row("FB1", "D1", "Zentrale Unternehmensrisiken (Freitext)", "Central business risks (open)", FF12));
  out.push(row("FB1", "D2", "Frühwarn-Beobachtung / worauf achten (Freitext)", "Early-warning monitoring (open)", FF12));
  out.push(row("FB1", "D3", "Prozesse/Bereiche für Analyse (Freitext)", "Processes/areas to analyse (open)", FF123));
  out.push(row("FB1", "D4", "Relevante KPIs / Kennzahlen (Freitext)", "Relevant KPIs (open)", FF123));

  // —— FB2 (pro Themenbereich gleiche Keys) ——
  pushScaleBlock(out, "FB2", "DQ ohne Tool", "DQ without tool", DQ_ITEMS, FF3);
  pushScaleBlock(out, "FB2", "EV ohne Tool", "EV without tool", EV_ITEMS, FF3);
  pushScaleBlock(out, "FB2", "TR ohne Tool", "TR without tool", TR_ITEMS, FF3);
  pushScaleBlock(out, "FB2", "CF ohne Tool", "CF without tool", CF_ITEMS, FF3);
  pushScaleBlock(out, "FB2", "CL ohne Tool", "CL without tool", CL_ITEMS, FF3);
  out.push(row("FB2", "O1", "Offen: größter Mehrwert (ohne Tool)", "Open: biggest benefit (no tool)", FF34));
  out.push(row("FB2", "O2", "Offen: größte Friktion (ohne Tool)", "Open: biggest friction (no tool)", FF34));
  out.push(row("FB2", "O3", "Offen: was fehlt für produktiven Einsatz (ohne Tool)", "Open: missing for productive use (no tool)", FF34));

  // —— FB3 ——
  pushScaleBlock(out, "FB3", "DQ mit Tool", "DQ with tool", DQ_ITEMS, FF3);
  pushScaleBlock(out, "FB3", "EV mit Tool", "EV with tool", EV_ITEMS, FF3);
  pushScaleBlock(out, "FB3", "TR mit Tool", "TR with tool", TR_ITEMS, FF3);
  pushScaleBlock(out, "FB3", "CF mit Tool", "CF with tool", CF_ITEMS, FF3);
  pushScaleBlock(out, "FB3", "CL mit Tool", "CL with tool", CL_ITEMS, FF3);
  pushScaleBlock(out, "FB3", "Usability mit Tool", "Usability with tool", US_ITEMS, FF34);
  pushScaleBlock(out, "FB3", "TAM/UTAUT mit Tool", "TAM/UTAUT with tool", TAM_UTAUT_ITEMS, FF34);
  pushScaleBlock(out, "FB3", "Vergleich COMP mit Tool", "Comparison COMP with tool", COMP_ITEMS, FF34);
  pushScaleBlock(out, "FB3", "FIT mit Tool", "FIT with tool", FIT_ITEMS, FF34);
  pushScaleBlock(out, "FB3", "GOV mit Tool", "GOV with tool", GOV_ITEMS, FF134);
  for (let i = 1; i <= 3; i++) {
    const k = `O${i}`;
    out.push(row("FB3", k, `Offene Antwort ${k} (mit Tool)`, `Open answer ${k} (with tool)`, FF34));
  }
  out.push(row("FB3", "E1", "Offen: wann Tool ungeeignet", "Open: when tool unsuitable", FF34));
  out.push(row("FB3", "E2", "Offen: Top-3 Verbesserungen", "Open: top 3 improvements", FF14));
  out.push(row("FB3", "E3", "Offen: Betriebsmodell (Assistenz/Auto/Hybrid)", "Open: operating model", FF14));

  // —— FB4 ——
  pushScaleBlock(out, "FB4", "Usability Direktvergleich", "Usability direct comparison", US_ITEMS, FF34);
  pushScaleBlock(out, "FB4", "TAM Direktvergleich", "TAM direct comparison", TAM_UTAUT_ITEMS, FF34);
  out.push(row("FB4", "O1", "Offen: Unterschied ohne/mit Tool", "Open: difference without/with tool", FF34));
  out.push(row("FB4", "O2", "Offen: Mehrwert hoch/niedrig", "Open: value high/low", FF34));
  out.push(row("FB4", "O3", "Offen: offene Punkte/Risiken", "Open: open issues/risks", FF234));
  pushScaleBlock(out, "FB4", "COMP Direktvergleich", "COMP direct comparison", COMP_ITEMS, FF3);
  pushScaleBlock(out, "FB4", "FIT Direktvergleich", "FIT direct comparison", FIT_ITEMS, FF34);
  pushScaleBlock(out, "FB4", "GOV Direktvergleich", "GOV direct comparison", GOV_ITEMS, FF134);
  out.push(row("FB4", "I1", "Interview: was funktioniert gut", "Interview: what worked well", FF34));
  out.push(row("FB4", "I2", "Interview: Probleme / Scheitern", "Interview: problems / failure signals", FF234));
  out.push(row("FB4", "I3", "Interview: Frühwarnsignale", "Interview: early-warning signals", FF2_ONLY));
  out.push(row("FB4", "I4", "Interview: Priorisierte Änderungen KI-Prozess", "Interview: prioritized AI-process changes", FF14));
  out.push(row("FB4", "I5", "Interview: sonstige Empfehlungen", "Interview: other recommendations", FF34));

  // —— FB5 ——
  out.push(row("FB5", "X1", "Likert: Sinn im Arbeitsalltag", "Likert: sense in daily work", FF4_ONLY));
  out.push(row("FB5", "X2", "Likert: dauerhafte Integration", "Likert: permanent integration", FF4_ONLY));
  out.push(row("FB5", "X3", "Likert: Nutzbarkeit Alltag", "Likert: everyday usability", FF4_ONLY));
  out.push(row("FB5", "X4", "Likert: Akzeptanz", "Likert: acceptance", FF4_ONLY));
  out.push(row("FB5", "X5", "Likert: Nutzen vs. Aufwand", "Likert: benefit vs. effort", FF4_ONLY));
  out.push(row("FB5", "T1", "Offen: hilfreichste Phasen/Workflows", "Open: most helpful phases/workflows", FF34));
  out.push(row("FB5", "T2", "Offen: konkrete Integration", "Open: concrete integration", FF4_ONLY));
  out.push(row("FB5", "T3", "Offen: Hemmnisse / Verzögerung", "Open: barriers / delay", FF4_ONLY));
  out.push(row("FB5", "T4", "Offen: Akzeptanz & Alltag", "Open: acceptance & everyday use", FF4_ONLY));

  // —— Szenario-Evaluation (DB / Export-Felder) ——
  out.push(row("SzenEval", "scenarioId", "Szenario-ID (Kontext)", "Scenario id (context)", FF13));
  out.push(row("SzenEval", "userAnswer", "Nutzerantwort (Text)", "User answer (text)", FF3));
  out.push(row("SzenEval", "userConfidence", "Nutzer-Konfidenz Antwort (0–100 %)", "User confidence in own answer (0–100%)", FF3));
  out.push(row("SzenEval", "aiAnswer", "KI-Antwort (Text)", "AI answer (text)", FF3));
  out.push(row("SzenEval", "aiConfidence", "KI-Konfidenz (0–100 %)", "AI confidence (0–100%)", FF3));
  out.push(row("SzenEval", "userPrefers", "Präferenz Nutzer vs. KI", "Preference user vs. AI", FF3));
  out.push(row("SzenEval", "userConfidenceInAi", "Konfidenz in KI-Antwort (0–100 %)", "Confidence in AI answer (0–100%)", FF34));
  const scenDims = [
    ["verstaendlichkeit", "Verständlichkeit KI-Antwort (1–5)", "Understandability (1–5)"],
    ["relevanz", "Relevanz (1–5)", "Relevance (1–5)"],
    ["nuetzlichkeit", "Nützlichkeit (1–5)", "Usefulness (1–5)"],
    ["vollstaendigkeit", "Vollständigkeit (1–5)", "Completeness (1–5)"],
    ["nachvollziehbarkeit", "Nachvollziehbarkeit (1–5)", "Traceability (1–5)"],
    ["praktikabilitaet", "Praktikabilität (1–5)", "Practicability (1–5)"],
    ["vertrauen", "Vertrauen (1–5)", "Trust (1–5)"],
    ["quellenqualitaet", "Quellenqualität (1–5)", "Source quality (1–5)"],
  ] as const;
  for (const [code, de, en] of scenDims) {
    out.push(row("SzenEval", `userEval.${code}`, `Nutzerbewertung ${de}`, `User rating ${en}`, FF3));
  }
  out.push(row("SzenEval", "aiEvaluationJson", "KI-Bewertung (JSON, Run)", "AI evaluation (JSON, run)", FF3));

  // —— Freier Use-Case (Legacy) ——
  out.push(row("UseCase", "useCaseDescription", "Freitext: Use-Case-Beschreibung", "Free text: use-case description", FF3));
  out.push(row("UseCase", "userDecisionApproach", "Freitext: Vorgehen Entscheidung", "Free text: decision approach", FF3));
  out.push(row("UseCase", "questionnaireJson", "Zusätzliche strukturierte Felder (falls genutzt)", "Additional structured fields (if used)", FF3));

  // —— Dokumenten-Evaluation ——
  out.push(row("DokEval", "answer_quality", "Likert: Antwortqualität (1–5)", "Likert: answer quality (1–5)", FF3));
  out.push(row("DokEval", "source_quality", "Likert: Quellenqualität (1–5)", "Likert: source quality (1–5)", FF3));
  out.push(row("DokEval", "realism", "Likert: Realismus/Umsetzbarkeit (1–5)", "Likert: realism/feasibility (1–5)", FF3));
  out.push(row("DokEval", "clarity", "Likert: Verständlichkeit (1–5)", "Likert: clarity (1–5)", FF3));
  out.push(row("DokEval", "structure", "Likert: Struktur (1–5)", "Likert: structure (1–5)", FF3));
  out.push(row("DokEval", "hallucinationPresent", "Halluzination ja/nein", "Hallucination yes/no", FF34));
  out.push(row("DokEval", "hallucinationNotes", "Freitext: Halluzination/Ungenauigkeit", "Free text: hallucination/inaccuracy", FF34));
  out.push(row("DokEval", "strengths", "Freitext: Stärken", "Free text: strengths", FF3));
  out.push(row("DokEval", "weaknesses", "Freitext: Schwächen", "Free text: weaknesses", FF34));
  out.push(row("DokEval", "improvementSuggestions", "Freitext: Verbesserungen", "Free text: improvements", FF14));
  out.push(row("DokEval", "ew_sensible", "Likert: Frühwarnsignale plausibel (1–5)", "Likert: EW plausible (1–5)", FF2_ONLY));
  out.push(row("DokEval", "ew_clear", "Likert: Frühwarnsignale verständlich (1–5)", "Likert: EW understandable (1–5)", FF2_ONLY));
  out.push(row("DokEval", "ew_helpful", "Likert: Frühwarnsignale hilfreich (1–5)", "Likert: EW helpful (1–5)", FF2_ONLY));
  out.push(row("DokEval", "ew_notes", "Freitext: Anmerkungen Frühwarnsignale", "Free text: EW notes", FF2_ONLY));
  out.push(row("DokEval", "ind_relevant", "Likert: Indikatoren/KPIs relevant (1–5)", "Likert: indicators relevant (1–5)", FF2_ONLY));
  out.push(row("DokEval", "ind_notes", "Freitext: Anmerkungen Indikatoren", "Free text: indicator notes", FF2_ONLY));

  // —— Berater-Evaluation (Chat / Entscheidungen) ——
  out.push(row("Berater", "answer_quality", "Likert: Antwortqualität (1–5)", "Likert: answer quality (1–5)", FF3));
  out.push(row("Berater", "source_quality", "Likert: Quellenqualität (1–5)", "Likert: source quality (1–5)", FF3));
  out.push(row("Berater", "realism", "Likert: Realismus (1–5)", "Likert: realism (1–5)", FF3));
  out.push(row("Berater", "clarity", "Likert: Klarheit (1–5)", "Likert: clarity (1–5)", FF3));
  out.push(row("Berater", "structure", "Likert: Struktur (1–5)", "Likert: structure (1–5)", FF3));
  out.push(row("Berater", "hallucinationPresent", "Halluzination ja/nein", "Hallucination yes/no", FF34));
  out.push(row("Berater", "hallucinationNotes", "Freitext: Halluzination/Notizen", "Free text: hallucination notes", FF34));
  out.push(row("Berater", "strengths", "Freitext: Stärken", "Free text: strengths", FF3));
  out.push(row("Berater", "weaknesses", "Freitext: Schwächen", "Free text: weaknesses", FF34));
  out.push(row("Berater", "improvementSuggestions", "Freitext: Verbesserungsvorschläge", "Free text: improvement suggestions", FF14));
  out.push(row("Berater", "kind", "Kontext chat|decisions (Metadaten)", "Context chat|decisions (metadata)", FF4_ONLY));

  return out;
}

export const EVALUATION_FF_MAP_ROWS: readonly EvaluationMapRow[] = buildRows();
