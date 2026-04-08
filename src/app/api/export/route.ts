import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";
import { getServerLocale } from "@/lib/locale";
import { studyScaleLabel, type Locale } from "@/lib/i18n";
import { getArtifactEvaluationsByCompany } from "@/lib/artifactEvaluations";
import { getFeatureEvaluations } from "@/lib/featureEvaluations";
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
import { SCENARIOS, SCENARIO_CATEGORIES } from "@/lib/scenarios";

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
    return NextResponse.redirect(new URL("/api/study/export", req.url));
  }

  const companyId = auth.company.id;
  const tables =
    scope === "study"
      ? await buildStudyTables(companyId, locale)
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

  const csv = tableToCsv(tables[0] ?? { title: scope, headers: [], rows: [] });
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

async function buildStudyTables(companyId: string, locale: Locale): Promise<Table[]> {
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

  const questionAnswerTable: Table = {
    title: "Frageboegen: Fragen und Antworten",
    headers: [
      "fragebogen",
      "kategorie",
      "frage_key",
      "frage_text",
      "antwort",
      "zeitpunkt",
    ],
    rows: [],
  };

  const latestByForm = new Map<
    string,
    {
      questionnaireType: string;
      category: string | null;
      createdAt: Date;
      items: Array<{ itemKey: string; valueNum: number | null; valueStr: string | null }>;
    }
  >();

  for (const p of participants) {
    for (const r of p.questionnaireResponses) {
      const key = `${p.id}:${r.questionnaireType}:${r.category ?? "global"}`;
      const prev = latestByForm.get(key);
      if (!prev || r.createdAt > prev.createdAt) {
        latestByForm.set(key, {
          questionnaireType: r.questionnaireType,
          category: r.category,
          createdAt: r.createdAt,
          items: r.items.map((it) => ({ itemKey: it.itemKey, valueNum: it.valueNum, valueStr: it.valueStr })),
        });
      }
    }
  }

  const latestResponses = Array.from(latestByForm.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const r of latestResponses) {
    const sorted = [...r.items].sort((a, b) => a.itemKey.localeCompare(b.itemKey));
    for (const item of sorted) {
      const answer = item.valueNum != null ? String(item.valueNum) : (item.valueStr ?? "");
      questionAnswerTable.rows.push([
        r.questionnaireType.toUpperCase(),
        r.category ? (SCENARIO_CATEGORIES[r.category as keyof typeof SCENARIO_CATEGORIES] ?? r.category) : "Global",
        item.itemKey,
        resolveQuestionText(r.questionnaireType, item.itemKey, locale),
        answer || "—",
        toIso(r.createdAt),
      ]);
    }
  }

  const analysisTable: Table = {
    title: "Auswertung (wie in der App)",
    headers: ["phase", "typ", "DQ", "EV", "TR", "CF", "CL"],
    rows: [],
  };

  const directCompareTable: Table = {
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

  const categories = Object.keys(SCENARIO_CATEGORIES) as Array<keyof typeof SCENARIO_CATEGORIES>;
  for (const category of categories) {
    const phase = SCENARIO_CATEGORIES[category];
    const fb2 = latestResponses.find((r) => r.questionnaireType === "fb2" && r.category === category);
    const fb3 = latestResponses.find((r) => r.questionnaireType === "fb3" && r.category === category);
    const fb4 = latestResponses.find((r) => r.questionnaireType === "fb4" && r.category === category);
    for (const entry of [
      { label: "User (FB2)", source: fb2 },
      { label: "Tool (FB3)", source: fb3 },
    ]) {
      const map = new Map((entry.source?.items ?? []).map((it) => [it.itemKey, it]));
      const valueOf = (k: string) => {
        const item = map.get(k);
        if (!item) return "—";
        if (item.valueNum != null) return String(item.valueNum);
        return item.valueStr ?? "—";
      };
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

  const participantTable: Table = {
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
      e.createdAt,
    ]),
  };

  return [evalTable, artifactsTable];
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
  const rows = await getFeatureEvaluations(companyId, "chat");
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
  if (v.includes(";") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
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
  page.drawText(isEn ? "Advisor Chat Evaluation" : "Berater-Chat Evaluation", {
    x: margin + 12,
    y: y - 18,
    size: 15,
    font: fontBold,
    color: rgb(0.0, 0.45, 0.39),
  });
  y -= 60;

  if (!table) return doc.save();
  for (const row of table.rows) {
    const [, , q, s, r, c, st, h, hn, str, weak, imp, created] = row;
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

function resolveQuestionText(questionnaireType: string, itemKey: string, locale: Locale): string {
  const keyed = QUESTION_TEXT_BY_KEY[`${questionnaireType}${itemKey}`];
  if (keyed) return keyed;
  if (ALL_LIKERT_SCALE_KEYS.has(itemKey)) return studyScaleLabel(locale, itemKey);
  if (/^O\d+$/i.test(itemKey)) return "Offene Frage";
  if (/^I\d+$/i.test(itemKey)) return "Interview-Frage";
  return itemKey;
}

function avgKeys(
  itemMap: Map<string, { itemKey: string; valueNum: number | null; valueStr: string | null }>,
  keys: string[]
): string {
  const nums = keys
    .map((k) => itemMap.get(k)?.valueNum)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return "—";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
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
