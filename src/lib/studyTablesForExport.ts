import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";
import { studyScaleLabel } from "@/lib/i18n";
import {
  ALL_LIKERT_SCALE_KEYS,
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
import { encodeNumericAnswerForStudySpss } from "@/lib/spssQuestionnaireCoding";
import { getStudyCategoryLabels, VALID_STUDY_CATEGORIES } from "@/lib/studyCategoryContext";
import { applyStudyReverse } from "@/lib/studyReverseCoding";

function applySpssReverse(key: string, value: number): number {
  return applyStudyReverse(key, value);
}

/** Reihenfolge wie in Auswertung (FB2/3 gemeinsamer Skalenblock): DQ … CL. */
const FB23_NUMERIC_COLUMNS = [...DQ_ITEMS, ...EV_ITEMS, ...TR_ITEMS, ...CF_ITEMS, ...CL_ITEMS].map((i) => i.key);

/** Reihenfolge wie „Direktvergleich“ in der App (FB4). */
const FB4_COMPARE_COLUMNS = [
  ...US_ITEMS,
  ...TAM_UTAUT_ITEMS,
  ...COMP_ITEMS,
  ...FIT_ITEMS,
  ...GOV_ITEMS,
].map((i) => i.key);

const FB5_LIKERT_KEYS = ["X1", "X2", "X3", "X4", "X5"] as const;

type ResponseItemSnap = { itemKey: string; valueNum: number | null; valueStr: string | null };

export type LatestQuestionnaireSnapshot = {
  responseId: string;
  questionnaireType: string;
  category: string | null;
  createdAt: Date;
  items: ResponseItemSnap[];
};

export type StudyExportTable = {
  title: string;
  headers: string[];
  rows: string[][];
};

function boolStr(v: boolean): string {
  return v ? "1" : "0";
}

function toIso(v: Date | string): string {
  return (v instanceof Date ? v : new Date(v)).toISOString();
}

const QUESTION_TEXT_BY_KEY: Record<string, string> = {
  fb1A1: "Rolle im Unternehmen",
  fb1A2: "Wo steht Ihr Unternehmen gerade (Entwicklungsstand)",
  fb1A3: "Teamgroesse",
  fb1A4: "Branche",
  fb1A5: "Erfahrung in Jahren",
  fb1A6: "Haeufigkeit strategischer Entscheidungen",
  fb1B1: "Nutzung von LLM/KI im Arbeitskontext",
  fb1B2: "Selbsteingeschaetzte Kompetenz im Umgang mit LLM/KI-Tools (1-7)",
  fb1B3: "Ich vertraue KI-Outputs grundsätzlich als Input für Business-Entscheidungen. (1-7)",
  fb1C1: "Unsere Entscheidungen sind aktuell gut strukturiert begründet. (1-7)",
  fb1C2: "Unsere Entscheidungen sind für Dritte gut nachvollziehbar (Audit Trail). (1-7)",
  fb1C3: "Unsere Entscheidungen sind aktuell gut durch Quellen/Daten belegt. (1-7)",
  fb1C4: "Ich fuehle mich bei strategischen Entscheidungen sicher. (1-7)",
  fb1C5: "In der Praxis fehlen haeufig entscheidungsrelevante Informationen/Quellen. (1-7)",
  fb1C6: "Der Zeitaufwand bis zu einer tragfaehigen Entscheidung ist hoch. (1-7)",
  fb1D1: "Welche zentralen Unternehmensrisiken sehen Sie aktuell?",
  fb1D2:
    "Worauf regelmaessig achten um Probleme frueh zu merken (z.B. Umsatz Liquiditaet Kundenfeedback)",
  fb1D3: "Welche Prozesse/Bereiche sollten konkret analysiert werden?",
  fb1D4:
    "Welche Indikatoren oder KPIs (Kennzahlen zum Messen von Erfolg und Fortschritt, z.B. Umsatz Kosten Kundenquote) sind besonders relevant?",
  fb5X1: "Insgesamt wuerde der Einsatz einer solchen Loesung Sinn ergeben.",
  fb5X2: "Ich kann mir vorstellen, den Ansatz dauerhaft zu integrieren.",
  fb5X3: "Die Nutzbarkeit im Alltag waere ausreichend.",
  fb5X4: "Die Akzeptanz bei Kolleginnen/Kollegen bzw. Fuehrung waere erreichbar.",
  fb5X5: "Der Nutzen rechtfertigt den Aufwand.",
  fb5T1: "Welche Phasen oder Workflows haben am meisten geholfen - und warum?",
  fb5T2: "Wie wuerden Sie die Integration konkret gestalten?",
  fb5T3: "Was wuerde den produktiven Einsatz verhindern oder verzoegern?",
  fb5T4: "Sonstige Anmerkungen zu Akzeptanz und Nutzung im Alltag?",
};

/** Lesbare Frage für qualitative Freitext-Exports (Excel/Übersicht). */
export function qualitativeItemQuestionLabel(locale: Locale, questionnaireType: string, itemKey: string): string {
  const keyed = QUESTION_TEXT_BY_KEY[`${questionnaireType}${itemKey}`];
  if (keyed) return keyed;
  if (ALL_LIKERT_SCALE_KEYS.has(itemKey)) return studyScaleLabel(locale, itemKey);
  if (/^O\d+$/i.test(itemKey)) return "Offene Frage";
  if (/^I\d+$/i.test(itemKey)) return "Interview-Frage";
  return itemKey;
}

function avgKeys(
  itemMap: Map<string, { itemKey: string; valueNum: number | null; valueStr: string | null }>,
  keys: string[],
): string {
  const nums = keys
    .map((k) => itemMap.get(k)?.valueNum)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return "—";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
}

/** Letzte Antwort je Teilnehmer + Formular + Kategorie (wie Excel/PDF). */
export async function loadStudyLatestSnapshots(companyId: string): Promise<{
  participants: Awaited<ReturnType<typeof prisma.studyParticipant.findMany>>;
  latestResponses: LatestQuestionnaireSnapshot[];
}> {
  const participants = await prisma.studyParticipant.findMany({
    where: { companyId },
    include: {
      questionnaireResponses: {
        include: { items: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const latestByForm = new Map<string, LatestQuestionnaireSnapshot>();

  for (const p of participants) {
    for (const r of p.questionnaireResponses) {
      const key = `${p.id}:${r.questionnaireType}:${r.category ?? "global"}`;
      const prev = latestByForm.get(key);
      if (!prev || r.createdAt > prev.createdAt) {
        latestByForm.set(key, {
          responseId: r.id,
          questionnaireType: r.questionnaireType,
          category: r.category,
          createdAt: r.createdAt,
          items: r.items.map((it) => ({ itemKey: it.itemKey, valueNum: it.valueNum, valueStr: it.valueStr })),
        });
      }
    }
  }

  const latestResponses = Array.from(latestByForm.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return { participants, latestResponses };
}

/** SPSS-FB2/FB3: eine Zeile, je Phase alle Items als *_ohne_<phase>, *_mit_<phase>. */
export async function buildFb2Fb3PhaseLikertWideTable(companyId: string, locale: Locale): Promise<StudyExportTable> {
  const { latestResponses } = await loadStudyLatestSnapshots(companyId);
  void locale;
  const orderedCategories = VALID_STUDY_CATEGORIES;
  const phaseCount = orderedCategories.length;

  const headers = Array.from({ length: phaseCount }, (_, idx) => idx + 1).flatMap((phaseNo) =>
    FB23_NUMERIC_COLUMNS.flatMap((itemKey) => [`${itemKey}_ohne_${phaseNo}`, `${itemKey}_mit_${phaseNo}`]),
  );

  function valsFor(questionnaireType: "fb2" | "fb3", category: string): Map<string, string> {
    const snap = latestResponses.find((x) => x.questionnaireType === questionnaireType && x.category === category);
    const map = new Map((snap?.items ?? []).map((it) => [it.itemKey, it]));
    const encoded = new Map<string, string>();
    for (const itemKey of FB23_NUMERIC_COLUMNS) {
      const it = map.get(itemKey);
      if (!it) {
        encoded.set(itemKey, "");
        continue;
      }
      encoded.set(itemKey, encodeNumericAnswerForStudySpss(itemKey, it.valueNum, it.valueStr, applySpssReverse));
    }
    return encoded;
  }

  const rowValues: string[] = [];
  for (let i = 0; i < phaseCount; i++) {
    const category = orderedCategories[i];
    if (!category) {
      rowValues.push(...FB23_NUMERIC_COLUMNS.flatMap(() => ["", ""]));
      continue;
    }
    const fb2Vals = valsFor("fb2", category);
    const fb3Vals = valsFor("fb3", category);
    rowValues.push(...FB23_NUMERIC_COLUMNS.flatMap((itemKey) => [fb2Vals.get(itemKey) ?? "", fb3Vals.get(itemKey) ?? ""]));
  }

  return { title: "FB2_FB3_Phasenmatrix", headers, rows: [rowValues] };
}

/** Eine Zeile pro Phase; Spalte „Phase“, dann US/PE/… wie Direktvergleich (FB4). */
export async function buildFb4PhaseDirectCompareWideTable(companyId: string): Promise<StudyExportTable> {
  const { latestResponses } = await loadStudyLatestSnapshots(companyId);
  const categories = VALID_STUDY_CATEGORIES;
  const headers = ["Phase", ...FB4_COMPARE_COLUMNS];
  const rows: string[][] = [];
  const labels = getStudyCategoryLabels("de");

  for (const category of categories) {
    const phase = labels[category] ?? category;
    const snap = latestResponses.find((r) => r.questionnaireType === "fb4" && r.category === category);
    const map = new Map((snap?.items ?? []).map((it) => [it.itemKey, it]));
    rows.push([
      phase,
      ...FB4_COMPARE_COLUMNS.map((itemKey) => {
        const it = map.get(itemKey);
        if (!it) return "";
        return encodeNumericAnswerForStudySpss(itemKey, it.valueNum, it.valueStr, applySpssReverse);
      }),
    ]);
  }

  return { title: "FB4_Direktvergleich", headers, rows };
}

/** Jede gespeicherte FB5-Erhebung eine Zeile; nur Likert X1–X5 (SPSS). Alle Durchläufe, nicht nur letzte je Teilnehmer. */
export async function buildFb5ClosingLikertWideTable(companyId: string): Promise<StudyExportTable> {
  const participants = await prisma.studyParticipant.findMany({
    where: { companyId },
    include: {
      questionnaireResponses: {
        where: { questionnaireType: "fb5" },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const fb5Snaps: LatestQuestionnaireSnapshot[] = [];
  for (const p of participants) {
    for (const r of p.questionnaireResponses) {
      fb5Snaps.push({
        responseId: r.id,
        questionnaireType: r.questionnaireType,
        category: r.category,
        createdAt: r.createdAt,
        items: r.items.map((it) => ({ itemKey: it.itemKey, valueNum: it.valueNum, valueStr: it.valueStr })),
      });
    }
  }
  fb5Snaps.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const headers = ["response_id", "category", "response_created_at", ...FB5_LIKERT_KEYS];
  const rows = fb5Snaps.map((r) => {
    const map = new Map(r.items.map((it) => [it.itemKey, it]));
    return [
      r.responseId,
      r.category ?? "",
      toIso(r.createdAt),
      ...FB5_LIKERT_KEYS.map((itemKey) => {
        const it = map.get(itemKey);
        if (!it) return "";
        return encodeNumericAnswerForStudySpss(itemKey, it.valueNum, it.valueStr, applySpssReverse);
      }),
    ];
  });

  return { title: "FB5_Abschluss_Likert", headers, rows };
}

/** Wie Excel/PDF für die Studien-Seite: Fragebogentabelle + Auswertung + Vergleich + Teilnehmer-Stammdaten (jeweils letzte Antwort pro Formular/Zelle wie in der App). */
export async function buildStudyTables(companyId: string, locale: Locale): Promise<StudyExportTable[]> {
  const { participants, latestResponses } = await loadStudyLatestSnapshots(companyId);
  const phaseLabels = getStudyCategoryLabels(locale);

  const questionAnswerTable: StudyExportTable = {
    title: "Frageboegen: Fragen und Antworten",
    headers: ["fragebogen", "kategorie", "frage_key", "frage_text", "antwort", "zeitpunkt"],
    rows: [],
  };

  for (const r of latestResponses) {
    const sorted = [...r.items].sort((a, b) => a.itemKey.localeCompare(b.itemKey));
    for (const item of sorted) {
      const answer = item.valueNum != null ? String(item.valueNum) : (item.valueStr ?? "");
      questionAnswerTable.rows.push([
        r.questionnaireType.toUpperCase(),
        r.category ? (phaseLabels[r.category as keyof typeof phaseLabels] ?? r.category) : "Global",
        item.itemKey,
        qualitativeItemQuestionLabel(locale, r.questionnaireType, item.itemKey),
        answer || "—",
        toIso(r.createdAt),
      ]);
    }
  }

  const analysisTable: StudyExportTable = {
    title: "Auswertung (wie in der App)",
    headers: ["phase", "typ", "DQ", "EV", "TR", "CF", "CL"],
    rows: [],
  };

  const directCompareTable: StudyExportTable = {
    title: "Direktvergleich (wie in der App)",
    headers: [
      "phase",
      ...US_ITEMS.map((i) => i.key),
      ...TAM_UTAUT_ITEMS.map((i) => i.key),
      ...COMP_ITEMS.map((i) => i.key),
      ...FIT_ITEMS.map((i) => i.key),
      ...GOV_ITEMS.map((i) => i.key),
    ],
    rows: [],
  };

  const categories = VALID_STUDY_CATEGORIES;
  for (const category of categories) {
    const phase = phaseLabels[category] ?? category;
    const fb2 = latestResponses.find((r) => r.questionnaireType === "fb2" && r.category === category);
    const fb3 = latestResponses.find((r) => r.questionnaireType === "fb3" && r.category === category);
    const fb4 = latestResponses.find((r) => r.questionnaireType === "fb4" && r.category === category);
    for (const entry of [
      { label: "User (FB2)", source: fb2 },
      { label: "Tool (FB3)", source: fb3 },
    ]) {
      const map = new Map((entry.source?.items ?? []).map((it) => [it.itemKey, it]));
      analysisTable.rows.push([
        phase,
        entry.label,
        avgKeys(map, DQ_ITEMS.map((i) => i.key)),
        avgKeys(map, EV_ITEMS.map((i) => i.key)),
        avgKeys(map, TR_ITEMS.map((i) => i.key)),
        avgKeys(map, CF_ITEMS.map((i) => i.key)),
        avgKeys(map, CL_ITEMS.map((i) => i.key)),
      ]);
    }

    const compareMap = new Map((fb4?.items ?? []).map((it) => [it.itemKey, it]));
    const compareVal = (k: string) => {
      const item = compareMap.get(k);
      if (!item) return "—";
      if (item.valueNum != null) return String(item.valueNum);
      return item.valueStr ?? "—";
    };
    directCompareTable.rows.push([
      phase,
      ...US_ITEMS.map((i) => compareVal(i.key)),
      ...TAM_UTAUT_ITEMS.map((i) => compareVal(i.key)),
      ...COMP_ITEMS.map((i) => compareVal(i.key)),
      ...FIT_ITEMS.map((i) => compareVal(i.key)),
      ...GOV_ITEMS.map((i) => compareVal(i.key)),
    ]);
  }

  const participantTable: StudyExportTable = {
    title: "Study Participants",
    headers: [
      "participant_id",
      "external_id",
      "completed_fb1",
      "completed_fb2_before_runs",
      "completed_fb3_after_runs",
      "completed_fb5",
      "completed_llm_setup",
      "participant_created_at",
    ],
    rows: participants.map((p) => [
      p.id,
      p.externalId ?? "",
      boolStr(p.completedFb1),
      boolStr(p.completedFb2BeforeRuns),
      boolStr(p.completedFb3AfterRuns),
      boolStr(p.completedFb5),
      boolStr(p.completedLlmSetup),
      toIso(p.createdAt),
    ]),
  };

  return [questionAnswerTable, analysisTable, directCompareTable, participantTable];
}
