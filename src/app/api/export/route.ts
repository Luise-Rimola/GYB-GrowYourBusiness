import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { getServerLocale } from "@/lib/locale";
import type { Locale } from "@/lib/i18n";
import { getArtifactEvaluationsByCompany } from "@/lib/artifactEvaluations";
import { getAllFeatureEvaluationsForCompany } from "@/lib/featureEvaluations";
import {
  SCENARIOS,
  SCENARIO_CATEGORIES,
  getScenarioById,
  getScenarioCategories,
  localizeScenario,
} from "@/lib/scenarios";
import { buildStudyTables as buildStudyExportTablesFromDb } from "@/lib/studyTablesForExport";

type ExportScope = "study" | "artifacts" | "evaluation" | "usecase" | "advisor";
type ExportFormat = "spss" | "pdf" | "excel";

type Table = {
  title: string;
  headers: string[];
  rows: string[][];
};

export async function GET(req: NextRequest) {
  const auth = await getCompanyForApi();
  if (!auth) return new NextResponse("Unauthorized", { status: 401 });

  const scope = parseScope(req.nextUrl.searchParams.get("scope"));
  const format = parseFormat(req.nextUrl.searchParams.get("format"));
  const anonymize = req.nextUrl.searchParams.get("anon") === "1";
  const langParam = req.nextUrl.searchParams.get("lang");
  const locale: Locale =
    langParam === "en" || langParam === "de"
      ? langParam
      : await getServerLocale();
  if (!scope || !format) {
    return NextResponse.json({ error: "Invalid scope or format" }, { status: 400 });
  }

  // Existing, SPSS-friendly wide export is already implemented for study.
  if (scope === "study" && format === "spss") {
    const u = new URL("/api/study/export", req.url);
    const studyLayout = req.nextUrl.searchParams.get("layout");
    if (studyLayout === "wide") u.searchParams.set("layout", "wide");
    const lng = req.nextUrl.searchParams.get("lang");
    if (lng === "de" || lng === "en") u.searchParams.set("lang", lng);
    const part = req.nextUrl.searchParams.get("part");
    if (
      part === "fb1" ||
      part === "f23" ||
      part === "fb2" ||
      part === "fb3" ||
      part === "fb4" ||
      part === "fb5" ||
      part === "full" ||
      part === "all" ||
      part === "complete"
    ) {
      u.searchParams.set("part", part);
    }
    return NextResponse.redirect(u);
  }

  const companyId = auth.company.id;

  if (scope === "artifacts" && format === "spss" && req.nextUrl.searchParams.get("layout") !== "eval_only") {
    const lines = await buildArtifactLongSpssRows(companyId);
    const csv = lines.join("\n");
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scope}-export.csv"`,
      },
    });
  }

  const tables =
    scope === "study"
      ? await buildStudyExportTablesFromDb(companyId, locale)
      : scope === "artifacts"
        ? await buildArtifactTables(companyId)
        : scope === "usecase"
          ? await buildUseCaseTables(companyId, anonymize)
          : scope === "advisor"
            ? await buildAdvisorTables(companyId, anonymize)
            : await buildEvaluationTables(companyId, anonymize);

  if (format === "pdf") {
    const pdf =
      scope === "study"
        ? await buildStudyCompanyReportPdf(tables, locale)
        : scope === "artifacts"
          ? await buildArtifactsCompanyReportPdf(tables, locale)
          : scope === "advisor"
            ? await buildAdvisorCompanyReportPdf(tables, locale)
            : await buildEvaluationCompanyReportPdf(tables, locale);
    const filename =
      scope === "study"
        ? "study-company-report.pdf"
        : scope === "artifacts"
          ? "artifacts-company-report.pdf"
          : scope === "usecase"
            ? "usecase-company-report.pdf"
            : scope === "advisor"
              ? "advisor-company-report.pdf"
              : "evaluation-company-report.pdf";
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "excel") {
    const html = buildExcelHtml(scope, tables);
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scope}-export.xls"`,
      },
    });
  }

  const spssTable =
    format === "spss" && (scope === "evaluation" || scope === "usecase")
      ? await buildScenarioEvaluationsSpssTable(companyId, anonymize, locale)
      : format === "spss" && scope === "advisor"
        ? await buildAdvisorEvaluationsSpssTable(companyId, anonymize, locale)
        : null;

  const csv = tableToCsv(spssTable ?? tables[0] ?? { title: scope, headers: [], rows: [] });
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${scope}-export.csv"`,
    },
  });
}

function parseScope(v: string | null): ExportScope | null {
  if (v === "study" || v === "artifacts" || v === "evaluation" || v === "usecase" || v === "advisor") return v;
  return null;
}

function parseFormat(v: string | null): ExportFormat | null {
  if (v === "spss" || v === "pdf" || v === "excel") return v;
  return null;
}

async function buildArtifactTables(companyId: string): Promise<Table[]> {
  const [artifacts, evals] = await Promise.all([
    prisma.artifact.findMany({
      where: { companyId },
      include: { run: { select: { workflowKey: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getArtifactEvaluationsByCompany(companyId),
  ]);

  const artifactsTable: Table = {
    title: "Artifacts",
    headers: ["artifact_id", "title", "type", "version", "workflow_key", "created_at"],
    rows: artifacts.map((a) => [
      a.id,
      a.title,
      a.type,
      String(a.version),
      a.run?.workflowKey ?? "",
      toIso(a.createdAt),
    ]),
  };

  const evalTable: Table = {
    title: "Artifact Evaluations",
    headers: [
      "evaluation_id",
      "artifact_id",
      "answer_quality",
      "source_quality",
      "realism",
      "clarity",
      "structure",
      "hallucination_present",
      "hallucination_notes",
      "strengths",
      "weaknesses",
      "improvement_suggestions",
      "created_at",
    ],
    rows: evals.map((e) => [
      e.id,
      e.artifactId,
      String(e.answerQuality),
      String(e.sourceQuality),
      String(e.realism),
      String(e.clarity),
      String(e.structure),
      boolStr(Boolean(e.hallucinationPresent)),
      e.hallucinationNotes ?? "",
      e.strengths ?? "",
      e.weaknesses ?? "",
      e.improvementSuggestions ?? "",
      toIso(e.createdAt as Date | string),
    ]),
  };

  return [evalTable, artifactsTable];
}

/** SPSS: wie Excel — zuerst alle Evaluationszeilen; danach Tabelle Artefakte (wie zweites Sheet). Zeilenliste mit Kommentarzeilen zwischen Blöcken. */
async function buildArtifactLongSpssRows(companyId: string): Promise<string[]> {
  const [artifacts, evals] = await Promise.all([
    prisma.artifact.findMany({
      where: { companyId },
      include: { run: { select: { workflowKey: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getArtifactEvaluationsByCompany(companyId),
  ]);

  type AE = Awaited<ReturnType<typeof getArtifactEvaluationsByCompany>>[number];
  const artifactById = new Map(artifacts.map((a) => [a.id, a]));

  const sortedEvals = evals.slice().sort((a: AE, b: AE) => {
    const artA = artifactById.get(a.artifactId);
    const artB = artifactById.get(b.artifactId);
    const ta = artA ? artA.createdAt.getTime() : Number.MAX_SAFE_INTEGER;
    const tb = artB ? artB.createdAt.getTime() : Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    return (
      new Date(a.createdAt as Date | string).getTime() - new Date(b.createdAt as Date | string).getTime()
    );
  });

  const evalHeader = [
    "artifact_id",
    "title",
    "type",
    "version",
    "workflow_key",
    "artifact_created_at",
    "evaluation_id",
    "answer_quality",
    "source_quality",
    "realism",
    "clarity",
    "structure",
    "hallucination_present",
    "hallucination_notes",
    "strengths",
    "weaknesses",
    "improvement_suggestions",
    "evaluation_created_at",
  ];
  const docHeader = ["artifact_id", "title", "type", "version", "workflow_key", "artifact_created_at"];

  const pushRow = (cells: string[]) => cells.map((c) => escapeCsv(String(c))).join(";");

  const out: string[] = [];
  out.push("# ==========================================================");
  out.push("# Artifact Evaluations (alle gespeicherten Bewertungen)");
  out.push("# ==========================================================");
  out.push(pushRow(evalHeader));
  for (const e of sortedEvals) {
    const a = artifactById.get(e.artifactId);
    out.push(
      pushRow([
        e.artifactId,
        a?.title ?? "",
        a?.type ?? "",
        a ? String(a.version) : "",
        a?.run?.workflowKey ?? "",
        a ? toIso(a.createdAt) : "",
        e.id,
        String(e.answerQuality),
        String(e.sourceQuality),
        String(e.realism),
        String(e.clarity),
        String(e.structure),
        boolStr(Boolean(e.hallucinationPresent)),
        e.hallucinationNotes ?? "",
        e.strengths ?? "",
        e.weaknesses ?? "",
        e.improvementSuggestions ?? "",
        toIso(e.createdAt as Date | string),
      ]),
    );
  }

  out.push("");
  out.push("# ==========================================================");
  out.push("# Artifacts Stammdaten (wie Excel zweite Tabelle)");
  out.push("# ==========================================================");
  out.push(pushRow(docHeader));
  for (const a of artifacts) {
    out.push(
      pushRow([
        a.id,
        a.title,
        a.type,
        String(a.version),
        a.run?.workflowKey ?? "",
        toIso(a.createdAt),
      ]),
    );
  }

  return out;
}

function toIsoDate(v: Date | string): string {
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

/** Likert 1–5 aus `userEvaluationJson` als Rohwert (gleiche Skala wie App / PDF-Excel). */
function likert1To5RawString(v: unknown): string {
  if (v === null || v === undefined) return "";
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) return "";
  const clamped = Math.min(5, Math.max(1, n));
  return String(Math.round(clamped));
}

/** Mittelwert der Likert-Items in `userEvaluationJson` (Skala 1–5). */
function overallScoreFromUserEval(ev: Record<string, unknown>): string {
  const keys = [
    "verstaendlichkeit",
    "relevanz",
    "nuetzlichkeit",
    "vollstaendigkeit",
    "nachvollziehbarkeit",
    "praktikabilitaet",
    "vertrauen",
    "quellenqualitaet",
  ] as const;
  const vals: number[] = [];
  for (const k of keys) {
    const n = Number(ev[k]);
    if (Number.isFinite(n) && n >= 1 && n <= 5) vals.push(n);
  }
  if (vals.length === 0) return "";
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return String(Math.round(mean * 100) / 100);
}

/** Szenario-/Use-Case-Evaluierung: eine Zeile pro abgeschlossener Bewertung (wie Übersicht `userPrefers` gesetzt). */
async function buildScenarioEvaluationsSpssTable(
  companyId: string,
  anonymize: boolean,
  locale: Locale,
): Promise<Table> {
  const headers = [
    "participant_id",
    "evaluation_id",
    "date",
    "phase",
    "usecase_type",
    "usecase_question",
    "user_preferred",
    "user_answer_score_pct",
    "ai_answer_score_pct",
    "confidence_ai_pct",
    "understandability",
    "relevance",
    "usefulness",
    "completeness",
    "traceability",
    "practicability",
    "trust",
    "source_quality",
    "overall_mean_1_to_5",
  ];

  const [evalRows, participant] = await Promise.all([
    prisma.scenarioEvaluation.findMany({
      where: { companyId, userPrefers: { not: null } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.studyParticipant.findUnique({
      where: { companyId_studyId: { companyId, studyId: "DSR-2025-01" } },
      select: { id: true, externalId: true },
    }),
  ]);

  const loc: "de" | "en" = locale === "en" ? "en" : "de";
  const categoryLabels = getScenarioCategories(loc);
  const participantBase = anonymize
    ? ""
    : (participant?.externalId?.trim() || participant?.id || "");

  const rows: string[][] = evalRows.map((s, idx) => {
    const scenario = getScenarioById(s.scenarioId);
    const localized = scenario ? localizeScenario(scenario, loc) : null;
    const ev = readObj(s.userEvaluationJson);

    const participantId = anonymize ? `participant_${idx + 1}` : participantBase;
    const evaluationId = anonymize ? `evaluation_${idx + 1}` : s.id;
    const phase = scenario?.category ?? "";
    const usecaseType = scenario ? (categoryLabels[scenario.category] ?? scenario.category) : "";
    const usecaseQuestion = anonymize ? "" : (localized?.question ?? "");

    return [
      participantId,
      evaluationId,
      toIsoDate(s.createdAt),
      phase,
      usecaseType,
      usecaseQuestion,
      s.userPrefers ?? "",
      String(s.userConfidence),
      s.aiConfidence == null ? "" : String(s.aiConfidence),
      s.userConfidenceInAi == null ? "" : String(s.userConfidenceInAi),
      likert1To5RawString(ev.verstaendlichkeit),
      likert1To5RawString(ev.relevanz),
      likert1To5RawString(ev.nuetzlichkeit),
      likert1To5RawString(ev.vollstaendigkeit),
      likert1To5RawString(ev.nachvollziehbarkeit),
      likert1To5RawString(ev.praktikabilitaet),
      likert1To5RawString(ev.vertrauen),
      likert1To5RawString(ev.quellenqualitaet),
      overallScoreFromUserEval(ev),
    ];
  });

  return {
    title: "Scenario evaluations (SPSS)",
    headers,
    rows,
  };
}

/** Mittelwert der fünf Likert-Items (Skala 1–5), für Export wie gespeichert (nicht 0–100). */
function overallScoreFromAdvisorLikerts(a: number, s: number, r: number, c: number, st: number): string {
  const vals = [a, s, r, c, st].filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  if (vals.length !== 5) return "";
  const mean = vals.reduce((x, y) => x + y, 0) / 5;
  return String(Math.round(mean * 100) / 100);
}

/** Berater-Evaluation (Chat + Entscheidungen): eine Zeile pro `FeatureEvaluation`. */
async function buildAdvisorEvaluationsSpssTable(
  companyId: string,
  anonymize: boolean,
  _locale: Locale,
): Promise<Table> {
  void _locale;
  const headers = [
    "participant_id",
    "evaluation_id",
    "date",
    "evaluation_kind",
    "answer_quality",
    "source_quality",
    "realism",
    "clarity",
    "structure",
    "hallucination_present",
    "hallucination_notes",
    "strengths",
    "weaknesses",
    "improvement_suggestions",
    "overall_mean_1_to_5",
  ];

  const [evalRows, participant] = await Promise.all([
    getAllFeatureEvaluationsForCompany(companyId),
    prisma.studyParticipant.findUnique({
      where: { companyId_studyId: { companyId, studyId: "DSR-2025-01" } },
      select: { id: true, externalId: true },
    }),
  ]);

  const participantBase = anonymize
    ? ""
    : (participant?.externalId?.trim() || participant?.id || "");

  const rows: string[][] = evalRows.map((r, idx) => {
    const a = r.answerQuality;
    const s = r.sourceQuality;
    const real = r.realism;
    const c = r.clarity;
    const st = r.structure;
    return [
      anonymize ? `participant_${idx + 1}` : participantBase,
      anonymize ? `advisor_eval_${idx + 1}` : r.id,
      toIsoDate(r.createdAt),
      r.kind,
      String(a),
      String(s),
      String(real),
      String(c),
      String(st),
      boolStr(Boolean(r.hallucinationPresent)),
      anonymize ? "" : (r.hallucinationNotes ?? ""),
      anonymize ? "" : (r.strengths ?? ""),
      anonymize ? "" : (r.weaknesses ?? ""),
      anonymize ? "" : (r.improvementSuggestions ?? ""),
      overallScoreFromAdvisorLikerts(a, s, real, c, st),
    ];
  });

  return {
    title: "Advisor evaluations (SPSS)",
    headers,
    rows,
  };
}

async function buildEvaluationTables(companyId: string, anonymize = false): Promise<Table[]> {
  const [useCases, scenarios] = await Promise.all([
    prisma.useCaseEvaluation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scenarioEvaluation.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const useCaseTable: Table = {
    title: "Use Case Evaluations",
    headers: [
      "id",
      "use_case_description",
      "user_decision_approach",
      "questionnaire_helpful",
      "questionnaire_fit",
      "questionnaire_user_one_word",
      "questionnaire_ai_one_word",
      "questionnaire_user_confidence_in_ai",
      "questionnaire_notes",
      "created_at",
    ],
    rows: useCases.map((u, idx) => {
      const q = readObj(u.questionnaireJson);
      return [
        anonymize ? `use_case_${idx + 1}` : u.id,
        anonymize ? "" : u.useCaseDescription,
        anonymize ? "" : u.userDecisionApproach,
        readNumString(q.helpful),
        readNumString(q.fit),
        readString(q.userOneWord),
        readString(q.aiOneWord),
        readNumString(q.userConfidenceInAi),
        readString(q.notes),
        toIso(u.createdAt),
      ];
    }),
  };

  const scenarioTable: Table = {
    title: "Scenario Evaluations",
    headers: [
      "id",
      "scenario_id",
      "user_answer",
      "user_confidence",
      "ai_answer",
      "ai_confidence",
      "user_prefers",
      "user_confidence_in_ai",
      "evaluation_verstaendlichkeit",
      "evaluation_relevanz",
      "evaluation_nuetzlichkeit",
      "evaluation_vollstaendigkeit",
      "evaluation_nachvollziehbarkeit",
      "evaluation_praktikabilitaet",
      "evaluation_vertrauen",
      "evaluation_quellenqualitaet",
      "created_at",
    ],
    rows: scenarios.map((s, idx) => {
      const ev = readObj(s.userEvaluationJson);
      return [
        anonymize ? `scenario_eval_${idx + 1}` : s.id,
        String(s.scenarioId),
        anonymize ? "" : s.userAnswer,
        String(s.userConfidence),
        anonymize ? "" : (s.aiAnswer ?? ""),
        s.aiConfidence == null ? "" : String(s.aiConfidence),
        s.userPrefers ?? "",
        s.userConfidenceInAi == null ? "" : String(s.userConfidenceInAi),
        readNumString(ev.verstaendlichkeit),
        readNumString(ev.relevanz),
        readNumString(ev.nuetzlichkeit),
        readNumString(ev.vollstaendigkeit),
        readNumString(ev.nachvollziehbarkeit),
        readNumString(ev.praktikabilitaet),
        readNumString(ev.vertrauen),
        readNumString(ev.quellenqualitaet),
        toIso(s.createdAt),
      ];
    }),
  };

  return [useCaseTable, scenarioTable];
}

async function buildUseCaseTables(companyId: string, anonymize = false): Promise<Table[]> {
  const useCases = await prisma.useCaseEvaluation.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  const useCaseTable: Table = {
    title: "Use Case Evaluations",
    headers: [
      "id",
      "use_case_description",
      "user_decision_approach",
      "questionnaire_helpful",
      "questionnaire_fit",
      "questionnaire_user_one_word",
      "questionnaire_ai_one_word",
      "questionnaire_user_confidence_in_ai",
      "questionnaire_notes",
      "created_at",
    ],
    rows: useCases.map((u, idx) => {
      const q = readObj(u.questionnaireJson);
      return [
        anonymize ? `use_case_${idx + 1}` : u.id,
        anonymize ? "" : u.useCaseDescription,
        anonymize ? "" : u.userDecisionApproach,
        readNumString(q.helpful),
        readNumString(q.fit),
        readString(q.userOneWord),
        readString(q.aiOneWord),
        readNumString(q.userConfidenceInAi),
        readString(q.notes),
        toIso(u.createdAt),
      ];
    }),
  };
  return [useCaseTable];
}

async function buildAdvisorTables(companyId: string, anonymize = false): Promise<Table[]> {
  const rows = await getAllFeatureEvaluationsForCompany(companyId);
  const table: Table = {
    title: "Advisor Evaluations",
    headers: [
      "id",
      "kind",
      "answer_quality",
      "source_quality",
      "realism",
      "clarity",
      "structure",
      "hallucination_present",
      "hallucination_notes",
      "strengths",
      "weaknesses",
      "improvement_suggestions",
      "created_at",
    ],
    rows: rows.map((r, idx) => [
      anonymize ? `advisor_eval_${idx + 1}` : r.id,
      r.kind,
      String(r.answerQuality),
      String(r.sourceQuality),
      String(r.realism),
      String(r.clarity),
      String(r.structure),
      boolStr(Boolean(r.hallucinationPresent)),
      anonymize ? "" : (r.hallucinationNotes ?? ""),
      anonymize ? "" : (r.strengths ?? ""),
      anonymize ? "" : (r.weaknesses ?? ""),
      anonymize ? "" : (r.improvementSuggestions ?? ""),
      toIso(r.createdAt),
    ]),
  };
  return [table];
}

function tableToCsv(table: Table): string {
  const lines: string[] = [];
  lines.push(table.headers.map(escapeCsv).join(";"));
  for (const row of table.rows) lines.push(row.map(escapeCsv).join(";"));
  return lines.join("\n");
}

function escapeCsv(v: string): string {
  if (v.includes(";") || v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function buildExcelHtml(scope: ExportScope, tables: Table[]): string {
  const blocks = tables
    .map((table) => {
      const head = `<tr>${table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
      const rows = table.rows
        .map((r) => `<tr>${r.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`)
        .join("");
      return `<h2>${escapeHtml(table.title)}</h2><table>${head}${rows}</table>`;
    })
    .join("<br/>");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${scope}-export</title><style>body{font-family:Arial,sans-serif;font-size:12px}table{border-collapse:collapse;margin-top:8px;margin-bottom:20px}th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top}th{background:#f5f5f5}</style></head><body>${blocks}</body></html>`;
}

async function buildPdfFromTables(tables: Table[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const titleSize = 16;
  const normalSize = 9;
  const smallSize = 8;
  const rowHeight = 14;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNo = 1;

  const drawFooter = () => {
    page.drawText(`Seite ${pageNo}`, {
      x: pageWidth - margin - 50,
      y: 12,
      size: smallSize,
      font,
      color: rgb(0.42, 0.44, 0.47),
    });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 18) {
      drawFooter();
      page = doc.addPage([pageWidth, pageHeight]);
      pageNo += 1;
      y = pageHeight - margin;
    }
  };

  const drawWrapped = (text: string, x: number, topY: number, maxWidth: number, size: number, bold = false) => {
    const lines = wrapText(text, maxWidth, size, bold ? fontBold : font);
    let yy = topY;
    for (const line of lines) {
      page.drawText(line, { x, y: yy, size, font: bold ? fontBold : font, color: rgb(0.13, 0.15, 0.18) });
      yy -= size + 2;
    }
    return yy;
  };

  // Header card
  page.drawRectangle({
    x: margin,
    y: y - 42,
    width: contentWidth,
    height: 42,
    color: rgb(0.93, 0.98, 0.97),
    borderWidth: 1,
    borderColor: rgb(0.73, 0.91, 0.86),
  });
  page.drawText("Grow your Business · Export", {
    x: margin + 12,
    y: y - 18,
    size: titleSize,
    font: fontBold,
    color: rgb(0.0, 0.45, 0.39),
  });
  page.drawText(new Date().toLocaleString("de-DE"), {
    x: margin + 12,
    y: y - 34,
    size: smallSize,
    font,
    color: rgb(0.42, 0.44, 0.47),
  });
  y -= 56;

  for (const table of tables) {
    ensureSpace(36);
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: contentWidth,
      height: 20,
      color: rgb(0.95, 0.96, 0.98),
      borderWidth: 1,
      borderColor: rgb(0.86, 0.88, 0.9),
    });
    page.drawText(table.title, {
      x: margin + 8,
      y: y - 14,
      size: 11,
      font: fontBold,
      color: rgb(0.12, 0.13, 0.14),
    });
    y -= 26;

    // keep PDF readable: show first columns, then "details" row-style text
    const shownColumns = Math.min(6, table.headers.length);
    const cols = table.headers.slice(0, shownColumns);
    const colWidth = contentWidth / shownColumns;

    ensureSpace(rowHeight + 6);
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rgb(0.9, 0.95, 0.99),
      borderWidth: 1,
      borderColor: rgb(0.75, 0.84, 0.92),
    });
    cols.forEach((h, i) => {
      page.drawText(truncateMiddle(h, 18), {
        x: margin + i * colWidth + 4,
        y: y - 10,
        size: smallSize,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.32),
      });
    });
    y -= rowHeight;

    const maxRows = Math.min(60, table.rows.length);
    for (let r = 0; r < maxRows; r++) {
      ensureSpace(rowHeight + 2);
      const isEven = r % 2 === 0;
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: isEven ? rgb(0.99, 0.99, 1) : rgb(0.97, 0.98, 0.99),
        borderWidth: 0.5,
        borderColor: rgb(0.9, 0.92, 0.94),
      });
      const row = table.rows[r];
      cols.forEach((_, i) => {
        const value = row[i] ?? "";
        page.drawText(truncateMiddle(value, 24), {
          x: margin + i * colWidth + 4,
          y: y - 10,
          size: smallSize,
          font,
          color: rgb(0.2, 0.22, 0.25),
        });
      });
      y -= rowHeight;

      // If the row has more fields, print compact detail line below
      if (row.length > shownColumns) {
        const detail = row
          .slice(shownColumns)
          .map((v, idx) => `${table.headers[shownColumns + idx]}: ${v}`)
          .join(" | ");
        ensureSpace(22);
        const nextY = drawWrapped(detail, margin + 6, y - 4, contentWidth - 12, smallSize, false);
        y = nextY - 3;
      }
    }

    if (table.rows.length > maxRows) {
      ensureSpace(14);
      page.drawText(`... weitere ${table.rows.length - maxRows} Zeilen im Excel/CSV Export`, {
        x: margin + 2,
        y: y - 10,
        size: smallSize,
        font,
        color: rgb(0.45, 0.47, 0.5),
      });
      y -= 16;
    }

    y -= 10;
  }

  drawFooter();

  return doc.save();
}

async function buildStudyCompanyReportPdf(tables: Table[], locale: Locale): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 13;
  const small = 9;
  const isEn = locale === "en";

  const qa = tables.find((t) => t.title.startsWith("Frageboegen"));
  const analysis = tables.find((t) => t.title.startsWith("Auswertung"));
  const compare = tables.find((t) => t.title.startsWith("Direktvergleich"));

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNo = 1;

  const footer = () =>
    page.drawText(`Seite ${pageNo}`, {
      x: pageWidth - margin - 50,
      y: 12,
      size: 8,
      font,
      color: rgb(0.42, 0.44, 0.47),
    });

  const newPage = () => {
    footer();
    page = doc.addPage([pageWidth, pageHeight]);
    pageNo += 1;
    y = pageHeight - margin;
  };

  const need = (h: number) => {
    if (y - h < margin + 16) newPage();
  };

  const write = (text: string, bold = false, size = small) => {
    need(lineHeight + 2);
    page.drawText(text, { x: margin, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.12, 0.14) });
    y -= lineHeight;
  };

  const wrapWrite = (text: string, indent = 0) => {
    const maxW = contentWidth - indent;
    for (const line of wrapText(text, maxW, small, font)) {
      need(lineHeight + 2);
      page.drawText(line, { x: margin + indent, y, size: small, font, color: rgb(0.16, 0.18, 0.2) });
      y -= lineHeight;
    }
  };

  page.drawRectangle({
    x: margin,
    y: y - 46,
    width: contentWidth,
    height: 46,
    color: rgb(0.93, 0.98, 0.97),
    borderWidth: 1,
    borderColor: rgb(0.73, 0.91, 0.86),
  });
  page.drawText(isEn ? "Questionnaire Evaluation" : "Fragebogen Auswertung", {
    x: margin + 12,
    y: y - 18,
    size: 15,
    font: fontBold,
    color: rgb(0.0, 0.45, 0.39),
  });
  page.drawText(new Date().toLocaleDateString("de-DE"), {
    x: margin + 12,
    y: y - 34,
    size: 8,
    font,
    color: rgb(0.42, 0.44, 0.47),
  });
  y -= 60;

  y -= 2;

  if (qa) {
    let currentGroup = "";
    for (const row of qa.rows) {
      const [fb, category, , questionText, answer] = row;
      const group = `${fb} - ${category}`;
      if (group !== currentGroup) {
        y -= 4;
        write(group, true);
        currentGroup = group;
      }
      wrapWrite(`${isEn ? "Question" : "Frage"}: ${questionText}`, 10);
      wrapWrite(`${isEn ? "Answer" : "Antwort"}: ${answer}`, 10);
      y -= 2;
    }
  }

  y -= 14;
  write(isEn ? "Analysis (as in app)" : "Auswertung (wie in der App)", true, 12);
  if (analysis) y = drawReportTable(page, y, margin, contentWidth, analysis, font, fontBold, true);

  y -= 18;
  write(isEn ? "Direct comparison (as in app)" : "Direktvergleich (wie in der App)", true, 12);
  if (compare) y = drawReportTable(page, y, margin, contentWidth, compare, font, fontBold, true);

  footer();
  return doc.save();
}

async function buildArtifactsCompanyReportPdf(tables: Table[], locale: Locale): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 13;
  const small = 9;
  const isEn = locale === "en";

  const evalTable = tables.find((t) => t.title.startsWith("Artifact Evaluations"));
  const artifactsTable = tables.find((t) => t.title === "Artifacts");

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNo = 1;

  const footer = () =>
    page.drawText(`Seite ${pageNo}`, {
      x: pageWidth - margin - 50,
      y: 12,
      size: 8,
      font,
      color: rgb(0.42, 0.44, 0.47),
    });
  const newPage = () => {
    footer();
    page = doc.addPage([pageWidth, pageHeight]);
    pageNo += 1;
    y = pageHeight - margin;
  };
  const need = (h: number) => {
    if (y - h < margin + 16) newPage();
  };
  const write = (text: string, bold = false, size = small) => {
    need(lineHeight + 2);
    page.drawText(text, { x: margin, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.12, 0.14) });
    y -= lineHeight;
  };
  const wrapWrite = (text: string, indent = 0) => {
    const maxW = contentWidth - indent;
    for (const line of wrapText(text, maxW, small, font)) {
      need(lineHeight + 2);
      page.drawText(line, { x: margin + indent, y, size: small, font, color: rgb(0.16, 0.18, 0.2) });
      y -= lineHeight;
    }
  };

  page.drawRectangle({
    x: margin,
    y: y - 46,
    width: contentWidth,
    height: 46,
    color: rgb(0.93, 0.98, 0.97),
    borderWidth: 1,
    borderColor: rgb(0.73, 0.91, 0.86),
  });
  page.drawText(isEn ? "Artifact Evaluation" : "Artefakt Evaluation", {
    x: margin + 12,
    y: y - 18,
    size: 15,
    font: fontBold,
    color: rgb(0.0, 0.45, 0.39),
  });
  page.drawText(new Date().toLocaleDateString("de-DE"), {
    x: margin + 12,
    y: y - 34,
    size: 8,
    font,
    color: rgb(0.42, 0.44, 0.47),
  });
  y -= 60;

  y -= 2;
  if (evalTable) {
    for (const row of evalTable.rows) {
      const [
        ,
        artifactId,
        answerQuality,
        sourceQuality,
        realism,
        clarity,
        structure,
        hallucinationPresent,
        hallucinationNotes,
        strengths,
        weaknesses,
        improvementSuggestions,
      ] = row;
      y -= 3;
      write(`${isEn ? "Artifact" : "Artefakt"}: ${artifactId}`, true);
      wrapWrite(`${isEn ? "Answer quality" : "Antwortqualitaet"}: ${answerQuality}/5`, 10);
      wrapWrite(`${isEn ? "Source quality" : "Quellenqualitaet"}: ${sourceQuality}/5`, 10);
      wrapWrite(`${isEn ? "Realism" : "Realismus"}: ${realism}/5`, 10);
      wrapWrite(`${isEn ? "Clarity" : "Verstaendlichkeit"}: ${clarity}/5`, 10);
      wrapWrite(`${isEn ? "Structure" : "Struktur"}: ${structure}/5`, 10);
      wrapWrite(`${isEn ? "Hallucination present" : "Halluzination vorhanden"}: ${hallucinationPresent === "1" ? (isEn ? "Yes" : "Ja") : (isEn ? "No" : "Nein")}`, 10);
      if (hallucinationNotes) wrapWrite(`${isEn ? "Hallucination notes" : "Hinweise Halluzination"}: ${hallucinationNotes}`, 10);
      if (strengths) wrapWrite(`${isEn ? "Strengths" : "Staerken"}: ${strengths}`, 10);
      if (weaknesses) wrapWrite(`${isEn ? "Weaknesses" : "Schwaechen"}: ${weaknesses}`, 10);
      if (improvementSuggestions) wrapWrite(`${isEn ? "Improvement suggestions" : "Verbesserungsvorschlaege"}: ${improvementSuggestions}`, 10);
      y -= 2;
    }
  }

  y -= 16;
  write(isEn ? "Tabular overview (as in app)" : "Tabellarische Uebersicht (wie in der App)", true, 12);
  if (evalTable) {
    const compact: Table = {
      title: isEn ? "Artifact evaluations" : "Artefakt-Evaluationen",
      headers: isEn ? ["artifact", "quality", "sources", "realism", "clarity", "structure", "hallucination"] : ["artefakt", "qualitaet", "quellen", "realismus", "verstaendlichkeit", "struktur", "halluzination"],
      rows: evalTable.rows.map((r) => [r[1], r[2], r[3], r[4], r[5], r[6], r[7] === "1" ? (isEn ? "Yes" : "Ja") : (isEn ? "No" : "Nein")]),
    };
    y = drawReportTable(page, y, margin, contentWidth, compact, font, fontBold, true);
  }

  y -= 16;
  write(isEn ? "Artifacts library" : "Artefakt-Bibliothek", true, 12);
  if (artifactsTable) {
    const compact: Table = {
      title: isEn ? "Artifacts" : "Dokumente",
      headers: isEn ? ["title", "type", "version", "workflow"] : ["titel", "typ", "version", "workflow"],
      rows: artifactsTable.rows.map((r) => [r[1], r[2], r[3], r[4]]),
    };
    y = drawReportTable(page, y, margin, contentWidth, compact, font, fontBold, true);
  }

  footer();
  return doc.save();
}

async function buildEvaluationCompanyReportPdf(tables: Table[], locale: Locale): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 13;
  const small = 9;
  const isEn = locale === "en";

  const useCaseTable = tables.find((t) => t.title.startsWith("Use Case Evaluations"));
  const scenarioTable = tables.find((t) => t.title.startsWith("Scenario Evaluations"));

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNo = 1;

  const footer = () =>
    page.drawText(`Seite ${pageNo}`, {
      x: pageWidth - margin - 50,
      y: 12,
      size: 8,
      font,
      color: rgb(0.42, 0.44, 0.47),
    });
  const newPage = () => {
    footer();
    page = doc.addPage([pageWidth, pageHeight]);
    pageNo += 1;
    y = pageHeight - margin;
  };
  const need = (h: number) => {
    if (y - h < margin + 16) newPage();
  };
  const write = (text: string, bold = false, size = small) => {
    need(lineHeight + 2);
    page.drawText(text, { x: margin, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.12, 0.14) });
    y -= lineHeight;
  };
  const wrapWrite = (text: string, indent = 0) => {
    const maxW = contentWidth - indent;
    for (const line of wrapText(text, maxW, small, font)) {
      need(lineHeight + 2);
      page.drawText(line, { x: margin + indent, y, size: small, font, color: rgb(0.16, 0.18, 0.2) });
      y -= lineHeight;
    }
  };

  page.drawRectangle({
    x: margin,
    y: y - 46,
    width: contentWidth,
    height: 46,
    color: rgb(0.93, 0.98, 0.97),
    borderWidth: 1,
    borderColor: rgb(0.73, 0.91, 0.86),
  });
  page.drawText(isEn ? "Use Case Evaluation" : "Use Case Evaluierung", {
    x: margin + 12,
    y: y - 18,
    size: 15,
    font: fontBold,
    color: rgb(0.0, 0.45, 0.39),
  });
  page.drawText(new Date().toLocaleDateString("de-DE"), {
    x: margin + 12,
    y: y - 34,
    size: 8,
    font,
    color: rgb(0.42, 0.44, 0.47),
  });
  y -= 60;

  write(isEn ? "Use cases (questions and answers)" : "Use Cases (Fragen und Antworten)", true, 12);
  if (useCaseTable) {
    for (const row of useCaseTable.rows) {
      const [, useCaseDescription, userDecisionApproach, helpful, fit, userOneWord, aiOneWord, userConfidenceInAi, notes] = row;
      y -= 3;
      wrapWrite(`${isEn ? "Use case" : "Use Case"}: ${useCaseDescription}`, 0);
      wrapWrite(`${isEn ? "Approach" : "Vorgehen"}: ${userDecisionApproach}`, 10);
      wrapWrite(`${isEn ? "Helpful (1-5)" : "Hilfreich (1-5)"}: ${helpful || "—"} | Fit (1-5): ${fit || "—"}`, 10);
      wrapWrite(`${isEn ? "User (1 word)" : "User (1 Wort)"}: ${userOneWord || "—"} | ${isEn ? "AI (1 word)" : "KI (1 Wort)"}: ${aiOneWord || "—"}`, 10);
      wrapWrite(`${isEn ? "Confidence in AI (%)" : "Konfidenz in KI (%)"}: ${userConfidenceInAi || "—"}`, 10);
      if (notes) wrapWrite(`${isEn ? "Notes" : "Notizen"}: ${notes}`, 10);
      y -= 2;
    }
  }

  y -= 16;
  write(isEn ? "Scenarios (questions and answers)" : "Szenarien (Fragen und Antworten)", true, 12);
  if (scenarioTable) {
    for (const row of scenarioTable.rows) {
      const [, scenarioId, userAnswer, userConfidence, aiAnswer, aiConfidence, userPrefers, userConfidenceInAi] = row;
      const scenarioNum = Number(scenarioId);
      const scenario = Number.isFinite(scenarioNum) ? SCENARIOS.find((s) => s.id === scenarioNum) : undefined;
      y -= 3;
      write(`${isEn ? "Scenario" : "Szenario"} ${scenarioId}`, true);
      if (scenario?.question) {
        wrapWrite(`${isEn ? "Question" : "Frage"}: ${scenario.question}`, 10);
      }
      if (scenario?.category) {
        wrapWrite(
          `${isEn ? "Category" : "Kategorie"}: ${SCENARIO_CATEGORIES[scenario.category] ?? scenario.category}`,
          10
        );
      }
      wrapWrite(`${isEn ? "User answer" : "User-Antwort"}: ${userAnswer || "—"}`, 10);
      wrapWrite(`${isEn ? "User confidence" : "User-Konfidenz"}: ${userConfidence || "—"}%`, 10);
      wrapWrite(`${isEn ? "AI answer" : "KI-Antwort"}: ${aiAnswer || "—"}`, 10);
      wrapWrite(`${isEn ? "AI confidence" : "KI-Konfidenz"}: ${aiConfidence || "—"}%`, 10);
      wrapWrite(`${isEn ? "Preference" : "Praeferenz"}: ${userPrefers || "—"} | ${isEn ? "Confidence in AI" : "Konfidenz in KI"}: ${userConfidenceInAi || "—"}%`, 10);
      y -= 2;
    }
  }

  y -= 16;
  write(isEn ? "Tabular overview (as in app)" : "Tabellarische Uebersicht (wie in der App)", true, 12);
  if (scenarioTable) {
    const compact: Table = {
      title: isEn ? "Scenario overview" : "Szenario Uebersicht",
      headers: isEn ? ["scenario", "user conf.", "ai conf.", "preference", "conf. in ai"] : ["szenario", "user konf.", "ki konf.", "praeferenz", "konf. in ki"],
      rows: scenarioTable.rows.map((r) => [r[1], r[3], r[5], r[6], r[7]]),
    };
    y = drawReportTable(page, y, margin, contentWidth, compact, font, fontBold, true);
  }

  footer();
  return doc.save();
}

async function buildAdvisorCompanyReportPdf(tables: Table[], locale: Locale): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 30;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 13;
  const small = 9;
  const isEn = locale === "en";
  const table = tables[0];

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const need = (h: number) => {
    if (y - h < margin + 16) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };
  const write = (text: string, bold = false) => {
    need(lineHeight + 2);
    page.drawText(text, { x: margin, y, size: small, font: bold ? fontBold : font, color: rgb(0.1, 0.12, 0.14) });
    y -= lineHeight;
  };
  const wrapWrite = (text: string, indent = 0) => {
    const maxW = contentWidth - indent;
    for (const line of wrapText(text, maxW, small, font)) {
      need(lineHeight + 2);
      page.drawText(line, { x: margin + indent, y, size: small, font, color: rgb(0.16, 0.18, 0.2) });
      y -= lineHeight;
    }
  };

  page.drawRectangle({
    x: margin,
    y: y - 46,
    width: contentWidth,
    height: 46,
    color: rgb(0.93, 0.98, 0.97),
    borderWidth: 1,
    borderColor: rgb(0.73, 0.91, 0.86),
  });
  page.drawText(isEn ? "Advisor evaluation (chat & decisions)" : "Berater-Evaluation (Chat & Entscheidungen)", {
    x: margin + 12,
    y: y - 18,
    size: 15,
    font: fontBold,
    color: rgb(0.0, 0.45, 0.39),
  });
  y -= 60;

  if (!table) return doc.save();
  for (const row of table.rows) {
    const [, kind, q, s, r, c, st, h, hn, str, weak, imp, created] = row;
    write(`${isEn ? "Context" : "Kontext"}: ${kind === "decisions" ? (isEn ? "Decisions" : "Entscheidungen") : "Chat"}`, true);
    write(`${isEn ? "Date" : "Datum"}: ${created}`, true);
    wrapWrite(`${isEn ? "Answer quality" : "Antwortqualitaet"}: ${q}/5`, 10);
    wrapWrite(`${isEn ? "Source quality" : "Quellenqualitaet"}: ${s}/5`, 10);
    wrapWrite(`${isEn ? "Realism" : "Realismus"}: ${r}/5`, 10);
    wrapWrite(`${isEn ? "Clarity" : "Verstaendlichkeit"}: ${c}/5`, 10);
    wrapWrite(`${isEn ? "Structure" : "Struktur"}: ${st}/5`, 10);
    wrapWrite(`${isEn ? "Hallucination present" : "Halluzination vorhanden"}: ${h === "1" ? (isEn ? "Yes" : "Ja") : (isEn ? "No" : "Nein")}`, 10);
    if (hn) wrapWrite(`${isEn ? "Notes" : "Notizen"}: ${hn}`, 10);
    if (str) wrapWrite(`${isEn ? "Strengths" : "Staerken"}: ${str}`, 10);
    if (weak) wrapWrite(`${isEn ? "Weaknesses" : "Schwaechen"}: ${weak}`, 10);
    if (imp) wrapWrite(`${isEn ? "Suggestions" : "Vorschlaege"}: ${imp}`, 10);
    y -= 6;
  }
  return doc.save();
}

function drawReportTable(
  page: PDFPage,
  startY: number,
  margin: number,
  contentWidth: number,
  table: Table,
  font: PDFFont,
  fontBold: PDFFont,
  compact = false
): number {
  let y = startY;
  const rowHeight = compact ? 11 : 14;
  const headers = table.headers;
  const shownCols = Math.min(compact ? 7 : 8, headers.length);
  const cols = headers.slice(0, shownCols);
  const colWidths = computeColumnWidths(cols, contentWidth);
  const colStarts: number[] = [];
  let xCursor = margin;
  for (const w of colWidths) {
    colStarts.push(xCursor);
    xCursor += w;
  }

  page.drawRectangle({
    x: margin,
    y: y - rowHeight,
    width: contentWidth,
    height: rowHeight,
    color: rgb(0.9, 0.95, 0.99),
    borderWidth: 1,
    borderColor: rgb(0.75, 0.84, 0.92),
  });
  cols.forEach((h, i) =>
    page.drawText(truncateEnd(h, i <= 1 ? 24 : 10), {
      x: colStarts[i] + 3,
      y: y - 8,
      size: 7,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.32),
    })
  );
  y -= rowHeight;

  const maxRows = compact ? 16 : 28;
  for (let r = 0; r < Math.min(table.rows.length, maxRows); r++) {
    const row = table.rows[r];
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: r % 2 === 0 ? rgb(0.99, 0.99, 1) : rgb(0.97, 0.98, 0.99),
      borderWidth: 0.5,
      borderColor: rgb(0.9, 0.92, 0.94),
    });
    cols.forEach((_, i) =>
      page.drawText(truncateEnd(row[i] ?? "", i === 0 ? 28 : i === 1 ? 14 : 6), {
        x: colStarts[i] + 3,
        y: y - 8,
        size: 7,
        font,
        color: rgb(0.2, 0.22, 0.25),
      })
    );
    y -= rowHeight;
  }
  return y;
}

function computeColumnWidths(headers: string[], contentWidth: number): number[] {
  if (headers.length === 0) return [];
  const weights = headers.map(() => 1);
  const first = headers[0]?.toLowerCase() ?? "";
  const second = headers[1]?.toLowerCase() ?? "";

  if (first === "phase") {
    weights[0] = 2.8;
    if (headers.length > 1 && second === "typ") weights[1] = 1.5;
    for (let i = 2; i < headers.length; i++) weights[i] = 0.85;
  } else if (first.includes("artefakt") || first.includes("titel")) {
    weights[0] = 2.4;
    for (let i = 1; i < headers.length; i++) weights[i] = 0.95;
  }

  const total = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (contentWidth * w) / total);
}

function truncateMiddle(input: string, max: number): string {
  if (input.length <= max) return input;
  const left = Math.ceil((max - 1) / 2);
  const right = Math.floor((max - 1) / 2);
  return `${input.slice(0, left)}…${input.slice(input.length - right)}`;
}

function truncateEnd(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(1, max - 1))}…`;
}

function wrapText(text: string, maxWidth: number, size: number, font: PDFFont): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function readObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function readString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readNumString(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
}

function boolStr(v: boolean): string {
  return v ? "1" : "0";
}

function toIso(v: Date | string): string {
  return (v instanceof Date ? v : new Date(v)).toISOString();
}

function escapeHtml(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
