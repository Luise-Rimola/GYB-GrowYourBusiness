import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import type { Locale } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale";
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
import {
  DOCUMENT_EVAL_PLANNING_PHASE_SLUGS,
  DOCUMENT_EVAL_PHASE_UNCATEGORIZED,
  evaluationTableSortRank,
} from "@/lib/planningFramework";
import {
  getArtifactEvaluationsByCompany,
  pickNewestArtifactPerWorkflowAndType,
  workflowTypeKeyForArtifact,
} from "@/lib/artifactEvaluations";
import { applyStudyReverse } from "@/lib/studyReverseCoding";
import {
  buildFb2Fb3PhaseLikertWideTable,
  buildFb4PhaseDirectCompareWideTable,
  buildFb5ClosingLikertWideTable,
  buildStudyTables,
  qualitativeItemQuestionLabel,
} from "@/lib/studyTablesForExport";
import { getStudyCategoryLabels, type StudyCategoryKey } from "@/lib/studyCategoryContext";
import {
  encodeNumericAnswerForStudySpss,
  isStudyQuestionItemIncludedInSpss,
} from "@/lib/spssQuestionnaireCoding";

type ResponseItemValue = { valueNum: number | null; valueStr: string | null };

type ResponseWithItems = {
  id: string;
  questionnaireType: string;
  category: string | null;
  createdAt: Date;
  items: Array<{ itemKey: string; valueNum: number | null; valueStr: string | null }>;
};

type StudyParticipantWithResponses = {
  id: string;
  externalId: string | null;
  createdAt: Date;
  questionnaireResponses: ResponseWithItems[];
};

type RawStudyExportRow = {
  participantId: string;
  externalId: string | null;
  participantCreatedAt: string | Date | null;
  responseId: string | null;
  questionnaireType: string | null;
  category: string | null;
  responseCreatedAt: string | Date | null;
  itemKey: string | null;
  valueNum: number | string | null;
  valueStr: string | null;
};

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function applyReverse(key: string, value: number): number {
  return applyStudyReverse(key, value);
}

type LoadedParticipant = {
  id: string;
  externalId: string | null;
  createdAt: Date;
  responses: Array<{
    id: string;
    questionnaireType: string;
    category: string | null;
    createdAt: Date;
    itemMap: Map<string, ResponseItemValue>;
  }>;
};

type LoadedResponse = LoadedParticipant["responses"][0];

function sortResponsesForStudyExport(responses: LoadedResponse[]): LoadedResponse[] {
  return [...responses].sort((a, b) => {
    const ka = responseFormKey(a.questionnaireType, a.category);
    const kb = responseFormKey(b.questionnaireType, b.category);
    const byForm = compareFormKeys(ka, kb);
    if (byForm !== 0) return byForm;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

type SpssNumericColumn = { formKey: string; itemKey: string; header: string };

type CorePhaseDef = { slug: string; category: string };

/** Wide-Export-Phasen 1–7, passend zu VALID_STUDY_CATEGORIES / Studien-FB2–FB4-Bereichen */
const CORE_PHASES: CorePhaseDef[] = [
  { slug: "phase1_market_business_model", category: "markt_geschaeftsmodell" },
  { slug: "phase2_product_strategy", category: "produktstrategie" },
  { slug: "phase3_marketing_investment", category: "launch_marketing_investition" },
  { slug: "phase4_launch_operations", category: "reifephase" },
  { slug: "phase5_growth_scaling", category: "wachstum_expansion" },
  { slug: "phase6_technology_digitalization", category: "technologie_digitalisierung" },
  { slug: "phase7_renewal_exit", category: "erneuerung_exit" },
];

const CORE_CONDITIONS = [
  { key: "ohne_tool", questionnaireType: "fb2" },
  { key: "mit_tool", questionnaireType: "fb3" },
] as const;

const CORE_VARIABLES = [...DQ_ITEMS, ...EV_ITEMS, ...TR_ITEMS, ...CF_ITEMS, ...CL_ITEMS].map((i) => i.key);
const COMPARISON_VARIABLES = [...US_ITEMS, ...TAM_UTAUT_ITEMS, ...COMP_ITEMS, ...FIT_ITEMS, ...GOV_ITEMS].map(
  (i) => i.key,
);

function spssNumericVarName(formKey: string, itemKey: string): string {
  return `${formKey}_${normalizeItemKey(itemKey)}`;
}

/** Eine Zeile pro Fragebogen-Durchgang; Spalten nur Likert/Skalenwerte fuer SPSS (keine Freitexte). Freitext-Items ohne Zahl sind keine Spalten. */
function buildWideNumericSpssLines(participants: LoadedParticipant[], questionnaireTypeLower: string): string[] {
  const responses = sortResponsesForStudyExport(
    participants.flatMap((p) => p.responses).filter((r) => r.questionnaireType.trim().toLowerCase() === questionnaireTypeLower),
  );
  if (responses.length === 0) return [];

  const colsByHdr = new Map<string, SpssNumericColumn>();
  for (const r of responses) {
    const fk = responseFormKey(r.questionnaireType, r.category);
    for (const [itemKey, item] of r.itemMap) {
      if (!isStudyQuestionItemIncludedInSpss(r.questionnaireType, itemKey)) continue;
      const enc = encodeNumericAnswerForStudySpss(itemKey, item.valueNum, item.valueStr, applyReverse);
      if (!enc) continue;
      const header = spssNumericVarName(fk, itemKey);
      if (!colsByHdr.has(header)) colsByHdr.set(header, { formKey: fk, itemKey, header });
    }
  }

  const cols = Array.from(colsByHdr.values()).sort(
    (a, b) => compareFormKeys(a.formKey, b.formKey) || a.itemKey.localeCompare(b.itemKey),
  );

  if (cols.length === 0) return [];

  const baseHdr = ["response_id", "questionnaire_type", "category", "response_created_at"];
  const lines: string[] = [];
  lines.push([...baseHdr, ...cols.map((c) => c.header)].map(escapeCsv).join(";"));

  for (const r of responses) {
    const rfk = responseFormKey(r.questionnaireType, r.category);
    const rowCells = cols.map((c) => {
      if (c.formKey !== rfk) return "";
      const item = r.itemMap.get(c.itemKey);
      if (!item) return "";
      return encodeNumericAnswerForStudySpss(c.itemKey, item.valueNum, item.valueStr, applyReverse);
    });
    lines.push(
      [
        r.id,
        r.questionnaireType,
        r.category ?? "",
        r.createdAt.toISOString(),
        ...rowCells,
      ]
        .map(escapeCsv)
        .join(";"),
    );
  }

  return lines;
}

function tableRowsToSemicolonCsv(table: { headers: string[]; rows: string[][] }): string {
  const lines: string[] = [];
  lines.push(table.headers.map(escapeCsv).join(";"));
  for (const row of table.rows) lines.push(row.map((c) => escapeCsv(String(c))).join(";"));
  return lines.join("\n");
}

function tableRowsToCommaCsv(table: { headers: string[]; rows: string[][] }): string {
  const lines: string[] = [];
  lines.push(table.headers.map(escapeCsv).join(","));
  for (const row of table.rows) lines.push(row.map((c) => escapeCsv(String(c))).join(","));
  return lines.join("\n");
}

/** RFC4180-safe: jedes Feld in Anführungszeichen — verhindert zerschossene Zeilen wenn Freitext Kommas enthält (Excel/import). */
function quoteCsvFieldAlways(val: string | number): string {
  const s = String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

function tableRowsToCommaCsvQuotedAll(table: { headers: string[]; rows: string[][] }): string {
  const lines: string[] = [];
  lines.push(table.headers.map((h) => quoteCsvFieldAlways(h)).join(","));
  for (const row of table.rows) {
    lines.push(row.map((c) => quoteCsvFieldAlways(String(c))).join(","));
  }
  return lines.join("\r\n");
}

/** Bewertungen nur als ganze Zahl 1–5; akzeptiert auch gespeichertes „4/5“ o.Ä. → „4“. */
function documentEvalLikertIntString(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(Math.min(5, Math.max(1, Math.round(raw))));
  }
  const s = String(raw ?? "").trim();
  const slash = /^(\d+)\s*\/\s*(\d+)\s*$/.exec(s);
  if (slash) return String(Math.min(5, Math.max(1, parseInt(slash[1], 10))));
  const n = Number(s);
  return Number.isFinite(n) ? String(Math.min(5, Math.max(1, Math.round(n)))) : "";
}

/** Optionale EW-/Indikatoren 1–5 oder leer. */
function documentEvalLikertOptionalString(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number" && !Number.isFinite(raw)) return "";
  const s = String(raw).trim();
  if (!s) return "";
  return documentEvalLikertIntString(s);
}

function normalizeExportKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").toLowerCase();
}

function toResponseMap(responses: LoadedParticipant["responses"]): Map<string, LoadedParticipant["responses"][0]> {
  const idx = new Map<string, LoadedParticipant["responses"][0]>();
  for (const r of responses) {
    const mapKey = `${r.questionnaireType}|${r.category ?? ""}`;
    const prev = idx.get(mapKey);
    if (!prev || r.createdAt > prev.createdAt) idx.set(mapKey, r);
  }
  return idx;
}

function encodeNumeric(itemKey: string, item: ResponseItemValue | undefined): string {
  if (!item) return "";
  return encodeNumericAnswerForStudySpss(itemKey, item.valueNum, item.valueStr, applyReverse);
}

function buildSurveyCoreWideTable(participants: LoadedParticipant[]): { headers: string[]; rows: string[][] } {
  const headers = [
    "participant_id",
    ...CORE_PHASES.flatMap((phase) =>
      CORE_CONDITIONS.flatMap((cond) =>
        CORE_VARIABLES.map((itemKey) => `${phase.slug}_${cond.key}_${itemKey}`),
      ),
    ),
  ];
  const rows = participants.map((p) => {
    const byForm = toResponseMap(p.responses);
    const values = CORE_PHASES.flatMap((phase) =>
      CORE_CONDITIONS.flatMap((cond) => {
        const r = byForm.get(`${cond.questionnaireType}|${phase.category}`);
        return CORE_VARIABLES.map((itemKey) => encodeNumeric(itemKey, r?.itemMap.get(itemKey)));
      }),
    );
    return [p.id, ...values];
  });
  return { headers, rows };
}

function buildComparisonWideTable(participants: LoadedParticipant[]): { headers: string[]; rows: string[][] } {
  const headers = [
    "participant_id",
    ...CORE_PHASES.flatMap((phase) =>
      COMPARISON_VARIABLES.map((itemKey) => `${phase.slug}_${itemKey}`),
    ),
  ];
  const rows = participants.map((p) => {
    const byForm = toResponseMap(p.responses);
    const values = CORE_PHASES.flatMap((phase) => {
      const r = byForm.get(`fb4|${phase.category}`);
      return COMPARISON_VARIABLES.map((itemKey) => encodeNumeric(itemKey, r?.itemMap.get(itemKey)));
    });
    return [p.id, ...values];
  });
  return { headers, rows };
}

/**
 * Eine Zeile pro Dokument wie in `/artifacts?tab=evaluations`: neuestes Artefakt je Workflow+Typ,
 * Bewertung = neueste Evaluation innerhalb aller Artefakt-IDs derselben Gruppe.
 */
async function buildDocumentEvaluationRowsTable(
  companyId: string,
  _locale: Locale,
  _participants: LoadedParticipant[],
): Promise<{ headers: string[]; rows: string[][] }> {
  /** Dokumentname + ausschließlich Likert 1–5 (optional leer); Halluzination: ja=1, nein=5. */
  const headers = [
    "DOKUMENTENNAME",
    "ANSWERQUALITY",
    "SOURCEQUALITY",
    "REALISM",
    "CLARITY",
    "STRUCTURE",
    "HALLUCINATION",
    "EW_SENSIBLE",
    "EW_CLEAR",
    "EW_HELPFUL",
    "IND_RELEVANT",
  ];

  const evals = await getArtifactEvaluationsByCompany(companyId);
  if (evals.length === 0) return { headers, rows: [] };

  const latestByArtifact = new Map<string, (typeof evals)[0]>();
  for (const ev of [...evals].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    latestByArtifact.set(ev.artifactId, ev);
  }

  const allArtifacts = await prisma.artifact.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, title: true, run: { select: { workflowKey: true } } },
  });
  const idsByWorkflowType = new Map<string, string[]>();
  for (const a of allArtifacts) {
    const k = workflowTypeKeyForArtifact(a);
    if (!idsByWorkflowType.has(k)) idsByWorkflowType.set(k, []);
    idsByWorkflowType.get(k)!.push(a.id);
  }
  const canonicalArtifacts = pickNewestArtifactPerWorkflowAndType(allArtifacts);

  const pickNewestEvalForGroup = (workflowTypeKey: string): (typeof evals)[0] | undefined => {
    const ids = idsByWorkflowType.get(workflowTypeKey) ?? [];
    let best: (typeof evals)[0] | undefined;
    let bestT = -Infinity;
    for (const id of ids) {
      const ev = latestByArtifact.get(id);
      if (!ev) continue;
      const t = new Date(ev.createdAt).getTime();
      if (t > bestT) {
        bestT = t;
        best = ev;
      }
    }
    return best;
  };

  const rowObjs: Array<{ sortRank: number; titleSort: string; row: string[] }> = [];
  for (const art of canonicalArtifacts) {
    const ev = pickNewestEvalForGroup(workflowTypeKeyForArtifact(art));
    if (!ev) continue;
    const aq = documentEvalLikertIntString(ev.answerQuality);
    const sq = documentEvalLikertIntString(ev.sourceQuality);
    const rl = documentEvalLikertIntString(ev.realism);
    const cl = documentEvalLikertIntString(ev.clarity);
    const st = documentEvalLikertIntString(ev.structure);
    const title = String(art.title ?? "").trim() || art.type;
    /** Wie übrige Likert-Items 1–5; „keine Halluzination“ = hoher positiver Wert. */
    const hallucinationLikert = ev.hallucinationPresent ? "1" : "5";

    rowObjs.push({
      sortRank: evaluationTableSortRank(art),
      titleSort: title.toLowerCase(),
      row: [
        title,
        aq,
        sq,
        rl,
        cl,
        st,
        hallucinationLikert,
        documentEvalLikertOptionalString(ev.ew_sensible),
        documentEvalLikertOptionalString(ev.ew_clear),
        documentEvalLikertOptionalString(ev.ew_helpful),
        documentEvalLikertOptionalString(ev.ind_relevant),
      ],
    });
  }

  rowObjs.sort((a, b) => a.sortRank - b.sortRank || a.titleSort.localeCompare(b.titleSort));
  return { headers, rows: rowObjs.map((o) => o.row) };
}

type QualitativeAnswerRow = {
  participantLabel: string;
  phaseLabel: string;
  questionnaire: string;
  itemKey: string;
  questionLabel: string;
  answer: string;
  savedAt: string;
};

function pickLatestResponsePerForm(responses: LoadedResponse[]): LoadedResponse[] {
  const best = new Map<string, LoadedResponse>();
  for (const r of responses) {
    const key = `${r.questionnaireType}\0${r.category ?? ""}`;
    const prev = best.get(key);
    if (!prev || r.createdAt.getTime() > prev.createdAt.getTime()) best.set(key, r);
  }
  return sortResponsesForStudyExport([...best.values()]);
}

function categoryPhaseLabel(locale: Locale, category: string | null): string {
  if (!category) {
    return locale === "en" ? "Overall (not tied to a topic area)" : "Gesamt (ohne Themenbereich)";
  }
  const labels = getStudyCategoryLabels(locale);
  return labels[category as StudyCategoryKey] ?? category;
}

function buildQualitativeAnswerRows(participants: LoadedParticipant[], locale: Locale): QualitativeAnswerRow[] {
  const out: QualitativeAnswerRow[] = [];
  for (const p of participants) {
    const participantLabel = (p.externalId ?? "").trim() || p.id;
    const latest = pickLatestResponsePerForm(p.responses);
    for (const r of latest) {
      const phaseLabel = categoryPhaseLabel(locale, r.category);
      const qUpper = r.questionnaireType.toUpperCase();
      for (const [itemKey, item] of r.itemMap.entries()) {
        const answer = (item.valueStr ?? "").trim();
        if (!answer) continue;
        out.push({
          participantLabel,
          phaseLabel,
          questionnaire: qUpper,
          itemKey,
          questionLabel: qualitativeItemQuestionLabel(locale, r.questionnaireType, itemKey),
          answer,
          savedAt: r.createdAt.toISOString(),
        });
      }
    }
  }
  out.sort((a, b) =>
    `${a.participantLabel} ${a.questionnaire} ${a.itemKey} ${a.savedAt}`.localeCompare(
      `${b.participantLabel} ${b.questionnaire} ${b.itemKey} ${b.savedAt}`,
    ),
  );
  return out;
}

function buildQualitativeAnswersTable(
  participants: LoadedParticipant[],
  locale: Locale,
): { headers: string[]; rows: string[][] } {
  const qualRows = buildQualitativeAnswerRows(participants, locale);
  const headers =
    locale === "en"
      ? ["participant_id", "topic_area", "questionnaire", "item_key", "question_wording", "answer_text", "saved_at_utc"]
      : ["teilnehmer_id", "themenbereich", "fragebogen", "item_schluessel", "fragentext", "antworttext", "gespeichert_utc"];
  const rows = qualRows.map((r) => [
    r.participantLabel,
    r.phaseLabel,
    r.questionnaire,
    r.itemKey,
    r.questionLabel,
    r.answer,
    r.savedAt,
  ]);
  return { headers, rows };
}

function htmlEsc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function qualitativeAnswersToExcelHtml(locale: Locale, rows: QualitativeAnswerRow[]): string {
  const isEn = locale === "en";
  const title = isEn
    ? "Study — open text answers (latest saved version per form)"
    : "Studie — offene Textantworten (jeweils letzte gespeicherte Version je Fragebogen)";
  const th = isEn
    ? ["Participant", "Topic area", "Form", "Item", "Question", "Answer", "Saved (UTC)"]
    : ["Teilnehmer", "Themenbereich", "Fragebogen", "Item", "Frage", "Antwort", "Gespeichert (UTC)"];
  const head = `<tr>${th.map((h) => `<th>${htmlEsc(h)}</th>`).join("")}</tr>`;
  const body = rows
    .map(
      (r) =>
        `<tr><td>${htmlEsc(r.participantLabel)}</td><td>${htmlEsc(r.phaseLabel)}</td><td>${htmlEsc(r.questionnaire)}</td><td>${htmlEsc(r.itemKey)}</td><td style="white-space:pre-wrap">${htmlEsc(r.questionLabel)}</td><td style="white-space:pre-wrap">${htmlEsc(r.answer)}</td><td>${htmlEsc(r.savedAt)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEsc(title)}</title><style>body{font-family:Arial,sans-serif;font-size:12px}table{border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}th{background:#f5f5f5}</style></head><body><h2>${htmlEsc(title)}</h2><table>${head}${body}</table></body></html>`;
}

function buildExportSchema(headersByFile: Record<string, string[]>): Record<string, unknown> {
  return {
    version: 1,
    encoding: "utf-8",
    delimiter: ",",
    qualitative_open_answers_file: "qualitative_answers.xls (HTML table for Excel; latest response per questionnaire+category; text fields only)",
    column_naming: "<phase>_<condition>_<variable>",
    phases: CORE_PHASES.map((p) => p.slug),
    document_evaluation_planning_phases: [...DOCUMENT_EVAL_PLANNING_PHASE_SLUGS, DOCUMENT_EVAL_PHASE_UNCATEGORIZED],
    document_evaluation_format:
      "one_row_per_visible_document (newest artifact per workflow+type, same grouping as /artifacts evaluations tab); DOKUMENTENNAME + Likert 1–5; HALLUCINATION ja=1 nein=5; EW_/IND_ optional",
    conditions: CORE_CONDITIONS.map((c) => c.key),
    core_variables: CORE_VARIABLES,
    comparison_variables: COMPARISON_VARIABLES,
    files: Object.fromEntries(
      Object.entries(headersByFile).map(([name, headers]) => [
        name,
        {
          row_unit:
            name === "qualitative_answers.xls"
              ? "answer"
              : name === "document_evaluation.csv"
                ? "evaluated_document"
                : "participant",
          headers,
        },
      ]),
    ),
  };
}

const QUESTIONNAIRE_GROUPS_SPSS = ["fb1", "fb2", "fb3", "fb4", "fb5"] as const;
/** Nur FB1 Roh-Durchläufe als breite Zahlenliste; FB4/FB5 wie UI (Phasenmatrix / Abschluss-Likert). */
const QUESTIONNAIRE_WIDE_NUMERIC_BLOCKS = ["fb1"] as const;

/** Pro Abschnitt: FB1 Roh numerisch → FB2+3 Phasenmatrix → FB4 Direktvergleich → FB5 Likert-Zeilen → Excel-parallele Aggregate. */
async function buildFullStudySpssPackageLines(
  companyId: string,
  locale: Locale,
  participants: LoadedParticipant[],
  excelLikeTables: Awaited<ReturnType<typeof buildStudyTables>>,
): Promise<string[]> {
  const [, analysisTable, directTable, participantTable] = excelLikeTables;
  const lines: string[] = [];

  const allResponses = participants.flatMap((p) => p.responses);
  const knownQt = new Set<string>(QUESTIONNAIRE_GROUPS_SPSS);

  lines.push("# ==========================================================");
  lines.push("# FB1: Roh-Durchläufe (nur Zahlen) | FB2+3/4: Phasenlayout wie UI | FB5: jede Erhebung X1–X5");
  lines.push("# ==========================================================");
  lines.push("");
  for (const qt of QUESTIONNAIRE_WIDE_NUMERIC_BLOCKS) {
    const block = buildWideNumericSpssLines(participants, qt);
    if (block.length === 0) continue;
    lines.push(`# --- ${qt.toUpperCase()} (nur Zahlantworten) ---`);
    lines.push(...block);
    lines.push("");
  }

  const phaseMx = await buildFb2Fb3PhaseLikertWideTable(companyId, locale);
  lines.push("# --- FB2 + FB3 Phasenmatrix (Phase ; DQ1 ; DQ2 ; … wie App) ---");
  lines.push(tableRowsToSemicolonCsv(phaseMx));
  lines.push("");

  const fb4Table = await buildFb4PhaseDirectCompareWideTable(companyId);
  lines.push(`# --- ${fb4Table.title} (Phase ; Direktvergleich-Items wie App) ---`);
  lines.push(tableRowsToSemicolonCsv(fb4Table));
  lines.push("");

  const fb5Table = await buildFb5ClosingLikertWideTable(companyId);
  lines.push(`# --- ${fb5Table.title} ---`);
  lines.push(tableRowsToSemicolonCsv(fb5Table));
  lines.push("");

  const unknownTypes = new Set(
    allResponses.map((r) => r.questionnaireType.trim().toLowerCase()).filter((t) => !knownQt.has(t)),
  );
  for (const qt of [...unknownTypes].sort()) {
    const block = buildWideNumericSpssLines(participants, qt);
    if (block.length === 0) continue;
    lines.push(`# --- ${qt.toUpperCase()} (nur Zahlantworten) ---`);
    lines.push(...block);
    lines.push("");
  }

  lines.push("# ==========================================================");
  lines.push("# Auswertung + Direktvergleich + Teilnehmer (wie Excel-Export / App-Aggregate)");
  lines.push("# ==========================================================");
  lines.push("");
  lines.push(`# --- ${analysisTable.title} ---`);
  lines.push(tableRowsToSemicolonCsv(analysisTable));
  lines.push("");
  lines.push(`# --- ${directTable.title} ---`);
  lines.push(tableRowsToSemicolonCsv(directTable));
  lines.push("");
  lines.push(`# --- ${participantTable.title} ---`);
  lines.push(tableRowsToSemicolonCsv(participantTable));
  lines.push("");
  return lines;
}

/** Legacy: eine Zeile pro Teilnehmer, nur jeweils letzte Antwort pro Formular+Kategorie. */
function buildWideLayoutRows(participants: LoadedParticipant[]): string[][] {
  const rows: string[][] = [];
  const latestByParticipantAndForm = new Map<
    string,
    Map<string, { createdAt: Date; itemMap: Map<string, ResponseItemValue> }>
  >();
  const formToItems = new Map<string, Set<string>>();

  for (const p of participants) {
    const formMap = new Map<string, { createdAt: Date; itemMap: Map<string, ResponseItemValue> }>();
    for (const r of p.responses) {
      const formKey = responseFormKey(r.questionnaireType, r.category);
      const prev = formMap.get(formKey);
      if (!prev || r.createdAt > prev.createdAt) {
        formMap.set(formKey, { createdAt: r.createdAt, itemMap: r.itemMap });
      }
      if (!formToItems.has(formKey)) formToItems.set(formKey, new Set<string>());
      for (const itemKey of r.itemMap.keys()) formToItems.get(formKey)!.add(itemKey);
    }
    latestByParticipantAndForm.set(p.id, formMap);
  }

  const formKeys = Array.from(formToItems.keys()).sort(compareFormKeys);
  const variableColumns: Array<{ col: string; formKey: string; itemKey?: string; meta?: "created_at" }> = [];
  for (const formKey of formKeys) {
    variableColumns.push({ col: `${formKey}_created_at`, formKey, meta: "created_at" });
    const itemKeys = Array.from(formToItems.get(formKey) ?? []).sort();
    for (const itemKey of itemKeys) {
      variableColumns.push({ col: `${formKey}_${normalizeItemKey(itemKey)}`, formKey, itemKey });
    }
  }

  const header = [
    "participant_id",
    "external_id",
    "participant_created_at",
    ...variableColumns.map((c) => c.col),
  ];
  rows.push(header);

  for (const p of participants) {
    const formMap = latestByParticipantAndForm.get(p.id) ?? new Map();
    const valueCols = variableColumns.map((c) => {
      const form = formMap.get(c.formKey);
      if (!form) return "";
      if (c.meta === "created_at") return form.createdAt.toISOString();
      const item = form.itemMap.get(c.itemKey!);
      if (!item) return "";
      return encodeNumericAnswerForStudySpss(c.itemKey!, item.valueNum, item.valueStr, applyReverse);
    });

    rows.push([p.id, p.externalId ?? "", p.createdAt.toISOString(), ...valueCols]);
  }
  return rows;
}

export async function GET(req: NextRequest) {
  const auth = await getCompanyForApi();
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { company } = auth;

  // Robust exportieren: wenn studyParticipant/questionnaireResponseItem-Delegates zur Laufzeit fehlen,
  // holen wir alles per SQL aus SQLite.
  const db = prisma as typeof prisma & {
    studyParticipant?: {
      findMany: (args: {
        where: { companyId: string };
        include: { questionnaireResponses: { include: { items: true }; orderBy: { createdAt: "asc" } } };
        orderBy: { createdAt: "asc" };
      }) => Promise<StudyParticipantWithResponses[]>;
    };
    questionnaireResponseItem?: unknown;
    $queryRaw: <T>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  };
  const hasStudyParticipantDelegate = Boolean(db.studyParticipant?.findMany);
  const hasQuestionnaireResponseItemDelegate = Boolean(db.questionnaireResponseItem);

  const participants: Array<{
    id: string;
    externalId: string | null;
    createdAt: Date;
    responses: Array<{
      id: string;
      questionnaireType: string;
      category: string | null;
      createdAt: Date;
      itemMap: Map<string, { valueNum: number | null; valueStr: string | null }>;
    }>;
  }> = [];

  if (hasStudyParticipantDelegate && hasQuestionnaireResponseItemDelegate) {
    // Standard-Path (Delegates vorhanden)
    const data = await db.studyParticipant!.findMany({
      where: { companyId: company.id },
      include: {
        questionnaireResponses: {
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const p of data) {
      const responses = (p.questionnaireResponses ?? []).map((r) => {
        const itemMap = new Map(
          (r.items ?? []).map((it) => [
            it.itemKey,
            { valueNum: it.valueNum, valueStr: it.valueStr } satisfies ResponseItemValue,
          ])
        );
        return {
          id: r.id,
          questionnaireType: r.questionnaireType,
          category: r.category ?? null,
          createdAt: r.createdAt,
          itemMap,
        };
      });

      participants.push({
        id: p.id,
        externalId: p.externalId ?? null,
        createdAt: p.createdAt,
        responses,
      });
    }
  } else {
    // Fallback-Path: per SQL exportieren (keine Delegates nötig)
    const rawRows = await db.$queryRaw<RawStudyExportRow[]>`
      SELECT
        sp."id"              AS "participantId",
        sp."externalId"     AS "externalId",
        sp."createdAt"      AS "participantCreatedAt",
        qr."id"              AS "responseId",
        qr."questionnaireType" AS "questionnaireType",
        qr."category"       AS "category",
        qr."createdAt"      AS "responseCreatedAt",
        qri."itemKey"       AS "itemKey",
        qri."valueNum"      AS "valueNum",
        qri."valueStr"      AS "valueStr"
      FROM "StudyParticipant" sp
      LEFT JOIN "QuestionnaireResponse" qr
        ON qr."participantId" = sp."id"
      LEFT JOIN "QuestionnaireResponseItem" qri
        ON qri."responseId" = qr."id"
      WHERE sp."companyId" = ${company.id}
      ORDER BY sp."id" ASC, qr."createdAt" ASC, qri."itemKey" ASC
    `;

    const participantMap = new Map<
      string,
      {
        id: string;
        externalId: string | null;
        createdAt: Date;
        responseMap: Map<
          string,
          {
            id: string;
            questionnaireType: string;
            category: string | null;
            createdAt: Date;
            itemMap: Map<string, { valueNum: number | null; valueStr: string | null }>;
          }
        >;
      }
    >();

    for (const row of rawRows) {
      if (!participantMap.has(row.participantId)) {
        participantMap.set(row.participantId, {
          id: row.participantId,
          externalId: row.externalId ?? null,
          createdAt: row.participantCreatedAt ? new Date(row.participantCreatedAt) : new Date(),
          responseMap: new Map(),
        });
      }

      const p = participantMap.get(row.participantId)!;

      // response can be null when no questionnaireResponses exist yet
      if (row.responseId) {
        if (!p.responseMap.has(row.responseId)) {
          p.responseMap.set(row.responseId, {
            id: row.responseId,
            questionnaireType: row.questionnaireType ?? "",
            category: row.category ?? null,
            createdAt: row.responseCreatedAt ? new Date(row.responseCreatedAt) : new Date(),
            itemMap: new Map(),
          });
        }

        const r = p.responseMap.get(row.responseId)!;
        if (row.itemKey) {
          r.itemMap.set(row.itemKey, {
            valueNum: row.valueNum === null ? null : Number(row.valueNum),
            valueStr: row.valueStr === null ? null : String(row.valueStr),
          });
        }
      }
    }

    for (const p of participantMap.values()) {
      participants.push({
        id: p.id,
        externalId: p.externalId,
        createdAt: p.createdAt,
        responses: Array.from(p.responseMap.values()),
      });
    }
  }

  const locale: Locale =
    req.nextUrl.searchParams.get("lang") === "en"
      ? "en"
      : req.nextUrl.searchParams.get("lang") === "de"
        ? "de"
        : await getServerLocale();

  const layout = req.nextUrl.searchParams.get("layout");
  const useWide = layout === "wide";
  const partParam = req.nextUrl.searchParams.get("part")?.trim().toLowerCase();
  const requestedPart = partParam ?? "full";
  const wantsSurveyCoreWide = requestedPart === "survey_core_wide" || requestedPart === "f23" || requestedPart === "fb2" || requestedPart === "fb3";
  const wantsComparisonWide = requestedPart === "comparison_wide" || requestedPart === "fb4";
  const wantsDocumentEval =
    requestedPart === "document_evaluation_wide" || requestedPart === "document_evaluation";
  const wantsQualitative = requestedPart === "qualitative_answers";
  const wantsExportSchema = requestedPart === "export_schema";
  const wantsFb1Wide = partParam === "fb1";
  const wantsFb5Closing = partParam === "fb5";
  const wantsFullPackage =
    !partParam || partParam === "full" || partParam === "all" || partParam === "complete";

  let csv: string;
  let filename = "study-export.csv";

  if (
    useWide &&
    (wantsFb1Wide ||
      wantsSurveyCoreWide ||
      wantsComparisonWide ||
      wantsDocumentEval ||
      wantsQualitative ||
      wantsExportSchema ||
      wantsFb5Closing)
  ) {
    return NextResponse.json(
      {
        error:
          "part=fb1|f23|fb4|fb5|survey_core_wide|comparison_wide|document_evaluation(_wide)|qualitative_answers|export_schema ist mit layout=wide nicht kombinierbar.",
      },
      { status: 400 },
    );
  }

  if (wantsSurveyCoreWide) {
    const table = buildSurveyCoreWideTable(participants);
    csv = tableRowsToCommaCsv(table);
    filename = "survey_core_wide.csv";
  } else if (wantsComparisonWide) {
    const table = buildComparisonWideTable(participants);
    csv = tableRowsToCommaCsv(table);
    filename = "comparison_wide.csv";
  } else if (wantsDocumentEval) {
    const table = await buildDocumentEvaluationRowsTable(company.id, locale, participants);
    csv = tableRowsToCommaCsvQuotedAll(table);
    filename = "document_evaluation.csv";
  } else if (wantsQualitative) {
    const qualRows = buildQualitativeAnswerRows(participants, locale);
    const html = qualitativeAnswersToExcelHtml(locale, qualRows);
    const qualFilename = locale === "en" ? "qualitative_open_answers.xls" : "qualitative_offene_antworten.xls";
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${qualFilename}"`,
      },
    });
  } else if (wantsExportSchema) {
    const surveyCore = buildSurveyCoreWideTable(participants);
    const comparison = buildComparisonWideTable(participants);
    const docEval = await buildDocumentEvaluationRowsTable(company.id, locale, participants);
    const qualitative = buildQualitativeAnswersTable(participants, locale);
    const schema = buildExportSchema({
      "survey_core_wide.csv": surveyCore.headers,
      "comparison_wide.csv": comparison.headers,
      "document_evaluation.csv": docEval.headers,
      "qualitative_answers.xls": qualitative.headers,
    });
    return new NextResponse(JSON.stringify(schema, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="export_schema.json"`,
      },
    });
  } else if (useWide) {
    const rows = buildWideLayoutRows(participants);
    csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
    filename = "study-export-wide.csv";
  } else if (wantsFb1Wide) {
    const lines = buildWideNumericSpssLines(participants, "fb1");
    csv =
      lines.length > 0
        ? lines.join("\n")
        : ["response_id", "questionnaire_type", "category", "response_created_at"].map(escapeCsv).join(";") + "\n";
    filename = "study-fb1.csv";
  } else if (requestedPart === "f23_legacy_matrix") {
    const table = await buildFb2Fb3PhaseLikertWideTable(company.id, locale);
    csv = tableRowsToSemicolonCsv(table);
    filename = "study-fb2-fb3-phasen-legacy.csv";
  } else if (wantsFb5Closing) {
    const table = await buildFb5ClosingLikertWideTable(company.id);
    csv = tableRowsToSemicolonCsv(table);
    filename = "study-fb5-abschluss.csv";
  } else if (wantsFullPackage) {
    const excelParallel = await buildStudyTables(company.id, locale);
    csv = (await buildFullStudySpssPackageLines(company.id, locale, participants, excelParallel)).join("\n");
    filename = "study-export-full.csv";
  } else {
    return NextResponse.json(
      {
        error:
          "Ungueltiger part. Erlaubt: survey_core_wide (oder f23/fb2/fb3), comparison_wide (oder fb4), document_evaluation oder document_evaluation_wide, qualitative_answers, export_schema, fb1, fb5, full.",
      },
      { status: 400 },
    );
  }

  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function normalizeCategory(category: string | null | undefined): string {
  if (!category) return "global";
  const map: Record<string, string> = {
    markt_geschaeftsmodell: "mgb",
    produktstrategie: "prod",
    marketing: "mkt",
    launch_marketing_investition: "launch",
    wachstum_expansion: "growth",
    investition_strategie: "invest",
    technologie_digitalisierung: "tech",
    reifephase: "maturity",
    erneuerung_exit: "renewal",
  };
  return map[category] ?? category.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
}

function normalizeItemKey(itemKey: string): string {
  return itemKey.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
}

function responseFormKey(questionnaireType: string, category: string | null): string {
  const q = normalizeItemKey(questionnaireType);
  const c = normalizeCategory(category);
  return `${q}_${c}`;
}

function compareFormKeys(a: string, b: string): number {
  // Keep a predictable order: fb1, fb2, fb3, fb4, fb5 then alpha.
  const rank = (v: string) =>
    v.startsWith("fb1_") ? 1 :
    v.startsWith("fb2_") ? 2 :
    v.startsWith("fb3_") ? 3 :
    v.startsWith("fb4_") ? 4 :
    v.startsWith("fb5_") ? 5 : 99;
  return rank(a) - rank(b) || a.localeCompare(b);
}
