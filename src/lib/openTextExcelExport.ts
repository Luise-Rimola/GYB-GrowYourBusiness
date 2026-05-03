/**
 * Excel-HTML (eine Tabelle): nur offene Textfelder mit Antworten, je Zeile Frage | Antwort.
 */

import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n";
import { getStudyCategoryLabels, type StudyCategoryKey } from "@/lib/studyCategoryContext";
import { getAllFeatureEvaluationsForCompany } from "@/lib/featureEvaluations";
import { getArtifactEvaluationsByCompany } from "@/lib/artifactEvaluations";
import { getScenarioById, localizeScenario } from "@/lib/scenarios";

export type OpenTextExportSection = "fb23" | "fb4" | "usecase" | "documents" | "advisor";

type QaRow = { question: string; answer: string };

function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function anonText(s: string, anonymize: boolean): string {
  if (!anonymize) return s;
  return s.trim() ? "[anonymisiert]" : "";
}

function pushIfText(rows: QaRow[], q: string, a: string, anonymize: boolean) {
  const t = a.trim();
  if (!t) return;
  rows.push({ question: q, answer: anonText(t, anonymize) });
}

function extractOpenObject(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null;
  const open = (json as Record<string, unknown>).open;
  if (!open || typeof open !== "object") return null;
  return open as Record<string, unknown>;
}

function extractInterviewObject(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null;
  const iv = (json as Record<string, unknown>).interview;
  if (!iv || typeof iv !== "object") return null;
  return iv as Record<string, unknown>;
}

function stringField(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

async function buildFb23Rows(
  locale: Locale,
  participantId: string,
  anonymize: boolean,
): Promise<QaRow[]> {
  const t = getTranslations(locale);
  const catLabels = getStudyCategoryLabels(locale);
  const raw = await prisma.questionnaireResponse.findMany({
    where: { participantId, questionnaireType: { in: ["fb2", "fb3"] } },
    orderBy: { createdAt: "desc" },
    select: { questionnaireType: true, category: true, responsesJson: true },
  });

  const seen = new Set<string>();
  const latest: typeof raw = [];
  for (const r of raw) {
    const k = `${r.questionnaireType}|${r.category ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    latest.push(r);
  }

  const fb2L = [t.study.fb2OpenWithoutTool1, t.study.fb2OpenWithoutTool2, t.study.fb2OpenWithoutTool3] as const;
  const fb3L = [t.study.fb3OpenWithTool1, t.study.fb3OpenWithTool2, t.study.fb3OpenWithTool3] as const;

  const rows: QaRow[] = [];
  for (const r of latest) {
    const open = extractOpenObject(r.responsesJson);
    if (!open) continue;
    const cat = r.category as StudyCategoryKey | null;
    const catPart = cat && catLabels[cat] ? `${catLabels[cat]} · ` : "";

    if (r.questionnaireType === "fb2") {
      for (let i = 0; i < 3; i++) {
        const key = `O${i + 1}` as const;
        const text = stringField(open, key);
        const q = `FB2 · ${catPart}${fb2L[i]} (${key})`;
        pushIfText(rows, q, text, anonymize);
      }
    } else if (r.questionnaireType === "fb3") {
      for (let i = 0; i < 3; i++) {
        const ok = `O${i + 1}` as const;
        const ek = `E${i + 1}` as const;
        const oText = stringField(open, ok);
        const eText = stringField(open, ek);
        const baseQ = `FB3 · ${catPart}${fb3L[i]}`;
        pushIfText(rows, `${baseQ} (${ok})`, oText, anonymize);
        if (eText && eText !== oText) pushIfText(rows, `${baseQ} (${ek})`, eText, anonymize);
      }
    }
  }
  return rows;
}

async function buildFb4Rows(locale: Locale, participantId: string, anonymize: boolean): Promise<QaRow[]> {
  const t = getTranslations(locale);
  const catLabels = getStudyCategoryLabels(locale);
  const raw = await prisma.questionnaireResponse.findMany({
    where: { participantId, questionnaireType: "fb4" },
    orderBy: { createdAt: "desc" },
    select: { category: true, responsesJson: true },
  });

  const seen = new Set<string>();
  const latest: typeof raw = [];
  for (const r of raw) {
    const k = r.category ?? "";
    if (seen.has(k)) continue;
    seen.add(k);
    latest.push(r);
  }

  const openL = [t.study.fb4OpenCompare1, t.study.fb4OpenCompare2, t.study.fb4OpenCompare3] as const;
  const intL = [
    t.study.fb4Interview1,
    t.study.fb4Interview2,
    t.study.fb4Interview3,
    t.study.fb4Interview4,
    t.study.fb4Interview5,
  ] as const;

  const rows: QaRow[] = [];
  for (const r of latest) {
    const cat = r.category as StudyCategoryKey | null;
    const catPart = cat && catLabels[cat] ? `${catLabels[cat]} · ` : "";
    const open = extractOpenObject(r.responsesJson);
    if (open) {
      for (let i = 0; i < 3; i++) {
        const key = `O${i + 1}` as const;
        pushIfText(rows, `FB4 · ${catPart}${openL[i]} (${key})`, stringField(open, key), anonymize);
      }
    }
    const interview = extractInterviewObject(r.responsesJson);
    if (interview) {
      for (let i = 0; i < 5; i++) {
        const key = `I${i + 1}` as const;
        pushIfText(rows, `FB4 · ${catPart}${intL[i]} (${key})`, stringField(interview, key), anonymize);
      }
    }
  }
  return rows;
}

async function buildUsecaseRows(companyId: string, locale: Locale, anonymize: boolean): Promise<QaRow[]> {
  const loc = locale === "en" ? "en" : "de";
  const evs = await prisma.scenarioEvaluation.findMany({
    where: { companyId, userPrefers: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  const rows: QaRow[] = [];
  for (const ev of evs) {
    const sc = getScenarioById(ev.scenarioId);
    const locSc = sc ? localizeScenario(sc, loc) : null;
    const title = locSc?.question ?? `Scenario #${ev.scenarioId}`;
    pushIfText(rows, `${title} — ${locale === "en" ? "User answer" : "Nutzerantwort"}`, ev.userAnswer ?? "", anonymize);
    if (ev.aiAnswer?.trim()) {
      pushIfText(rows, `${title} — ${locale === "en" ? "AI answer" : "KI-Antwort"}`, ev.aiAnswer, anonymize);
    }
  }
  return rows;
}

async function buildDocumentsRows(companyId: string, locale: Locale, anonymize: boolean): Promise<QaRow[]> {
  const isEn = locale === "en";
  const evals = await getArtifactEvaluationsByCompany(companyId);
  const arts = await prisma.artifact.findMany({
    where: { companyId, id: { in: [...new Set(evals.map((e) => e.artifactId))] } },
    select: { id: true, title: true, type: true },
  });
  const titleById = new Map(arts.map((a) => [a.id, a.title]));
  const rows: QaRow[] = [];
  const L = {
    hall: isEn ? "Hallucination notes" : "Halluzination / Anmerkungen",
    str: isEn ? "Strengths" : "Stärken",
    weak: isEn ? "Weaknesses" : "Schwächen",
    imp: isEn ? "Improvement suggestions" : "Verbesserungsvorschläge",
    ew: isEn ? "Early-warning notes" : "Frühwarn-Notizen",
    ind: isEn ? "Indicator notes" : "Indikator-Notizen",
  };
  for (const e of evals) {
    const docTitle = titleById.get(e.artifactId) ?? e.artifactId;
    const prefix = isEn ? `Document «${docTitle}»` : `Dokument «${docTitle}»`;
    pushIfText(rows, `${prefix} — ${L.hall}`, e.hallucinationNotes ?? "", anonymize);
    pushIfText(rows, `${prefix} — ${L.str}`, e.strengths ?? "", anonymize);
    pushIfText(rows, `${prefix} — ${L.weak}`, e.weaknesses ?? "", anonymize);
    pushIfText(rows, `${prefix} — ${L.imp}`, e.improvementSuggestions ?? "", anonymize);
    pushIfText(rows, `${prefix} — ${L.ew}`, e.ew_notes ?? "", anonymize);
    pushIfText(rows, `${prefix} — ${L.ind}`, e.ind_notes ?? "", anonymize);
  }
  return rows;
}

async function buildAdvisorRows(companyId: string, locale: Locale, anonymize: boolean): Promise<QaRow[]> {
  const isEn = locale === "en";
  const recs = await getAllFeatureEvaluationsForCompany(companyId);
  const rows: QaRow[] = [];
  let n = 0;
  for (const ev of recs) {
    n += 1;
    const ctx = ev.kind === "decisions" ? (isEn ? "Decisions" : "Entscheidungen") : "Chat";
    const prefix = isEn ? `Advisor (${ctx}) #${n}` : `Berater (${ctx}) #${n}`;
    const stripMarker = (s: string) => s.replace(/BACKFILL_ADVISOR_DEMO[^\n]*/g, "").trim();
    const hn = stripMarker(ev.hallucinationNotes ?? "");
    pushIfText(rows, `${prefix} — ${isEn ? "Hallucination notes" : "Halluzination / Notizen"}`, hn, anonymize);
    pushIfText(rows, `${prefix} — ${isEn ? "Strengths" : "Stärken"}`, ev.strengths ?? "", anonymize);
    pushIfText(rows, `${prefix} — ${isEn ? "Weaknesses" : "Schwächen"}`, ev.weaknesses ?? "", anonymize);
    pushIfText(
      rows,
      `${prefix} — ${isEn ? "Improvement suggestions" : "Verbesserungsvorschläge"}`,
      ev.improvementSuggestions ?? "",
      anonymize,
    );
  }
  return rows;
}

function toExcelHtml(title: string, colQ: string, colA: string, rows: QaRow[]): string {
  const head = `<tr><th>${esc(colQ)}</th><th>${esc(colA)}</th></tr>`;
  const body = rows
    .map((r) => `<tr><td>${esc(r.question)}</td><td>${esc(r.answer)}</td></tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial,sans-serif;font-size:12px}table{border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:6px 8px;vertical-align:top}th{background:#f5f5f5}</style></head><body><h2>${esc(title)}</h2><table>${head}${body}</table></body></html>`;
}

export async function buildOpenTextExcelExport(params: {
  companyId: string;
  section: OpenTextExportSection;
  locale: Locale;
  anonymize: boolean;
}): Promise<{ filename: string; html: string }> {
  const { companyId, section, locale, anonymize } = params;
  const isEn = locale === "en";
  const colQ = isEn ? "Question" : "Frage";
  const colA = isEn ? "Answer" : "Antwort";

  const participant = await prisma.studyParticipant.findUnique({
    where: { companyId_studyId: { companyId, studyId: "DSR-2025-01" } },
    select: { id: true },
  });

  let rows: QaRow[] = [];
  let filename = "open-answers.xls";
  let title = "Open answers";

  if (section === "fb23") {
    filename = isEn ? "study-fb2-fb3-open-text.xls" : "studie-fb2-fb3-offene-antworten.xls";
    title = isEn ? "Study FB2 & FB3 — open text only" : "Studie FB2 & FB3 — nur offene Antworten";
    if (participant) rows = await buildFb23Rows(locale, participant.id, anonymize);
  } else if (section === "fb4") {
    filename = isEn ? "study-fb4-open-text.xls" : "studie-fb4-offene-antworten.xls";
    title = isEn ? "Study FB4 — open text & interview" : "Studie FB4 — offene Fragen & Interview";
    if (participant) rows = await buildFb4Rows(locale, participant.id, anonymize);
  } else if (section === "usecase") {
    filename = isEn ? "use-case-open-text.xls" : "use-case-offene-antworten.xls";
    title = isEn ? "Scenario evaluation — text answers" : "Szenario-Evaluation — Textantworten";
    rows = await buildUsecaseRows(companyId, locale, anonymize);
  } else if (section === "documents") {
    filename = isEn ? "document-eval-open-text.xls" : "dokumente-evaluation-offene-antworten.xls";
    title = isEn ? "Document evaluation — text fields" : "Dokumenten-Evaluation — Textfelder";
    rows = await buildDocumentsRows(companyId, locale, anonymize);
  } else if (section === "advisor") {
    filename = isEn ? "advisor-eval-open-text.xls" : "berater-evaluation-offene-antworten.xls";
    title = isEn ? "Advisor evaluation — text fields" : "Berater-Evaluation — Textfelder";
    rows = await buildAdvisorRows(companyId, locale, anonymize);
  }

  return { filename, html: toExcelHtml(title, colQ, colA, rows) };
}
