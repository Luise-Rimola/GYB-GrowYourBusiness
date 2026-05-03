/**
 * Backfill: realistische Demo-Bewertungen für Artefakte ohne Eintrag in `ArtifactEvaluation`,
 * optional vollständige `ScenarioEvaluation`-Zeilen, optional synthetische FB5-Daten für drei Studienarme.
 *
 * Kein automatischer Zugriff aus dem Chat auf eure DB — lokal/staging ausführen:
 *
 *   npx tsx scripts/backfill-realistic-evaluations.ts --company=<cuid>
 *   npx tsx scripts/backfill-realistic-evaluations.ts --company=<cuid> --artifacts
 *   npx tsx scripts/backfill-realistic-evaluations.ts --company=<cuid> --questionnaire-arms
 *   npx tsx scripts/backfill-realistic-evaluations.ts --study-questionnaires
 *   npx tsx scripts/backfill-realistic-evaluations.ts --company=<cuid> --scenarios=sample
 *   npx tsx scripts/backfill-realistic-evaluations.ts --scenarios=per-category
 *       → je Kategorie 2 Demo-Szenarien (IDs 19–20, 39–40, 59–60, 79–80, 99–100)
 *       Ohne --company: für **jede** Company in der DB (damit die Übersicht zur Login-Firma passt).
 *
 *   npx tsx scripts/backfill-realistic-evaluations.ts --advisor=sample
 *       → je Firma 4 Demo-`FeatureEvaluation` (2× Chat, 2× Entscheidungen), markiert für --force-Löschung
 *       Ohne --company: für alle Firmen (wie --scenarios=per-category).
 *
 *   --dry-run   nur Ausgabe, keine Writes
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { createArtifactEvaluation, ensureArtifactEvaluationTable } from "../src/lib/artifactEvaluations";
import { createQuestionnaireItems } from "../src/lib/questionnaire-items";
import { SCENARIOS } from "../src/lib/scenarios";
import type { StudyCategoryKey } from "../src/lib/studyCategoryContext";
import { VALID_STUDY_CATEGORIES } from "../src/lib/studyCategoryContext";
import { getOrCreateStudyParticipant, updateStudyParticipantById } from "../src/lib/study";
import { createFeatureEvaluation, ensureFeatureEvaluationTable } from "../src/lib/featureEvaluations";

const prisma = new PrismaClient();

const ADVISOR_BACKFILL_MARKER = "BACKFILL_ADVISOR_DEMO";

function parseArgs(argv: string[]) {
  const out = {
    companyId: null as string | null,
    dryRun: false,
    artifacts: false,
    questionnaireArms: false,
    studyQuestionnaires: false,
    scenarios: "none" as "none" | "sample" | "all" | "per-category",
    advisor: "none" as "none" | "sample",
    force: false,
  };
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--artifacts") out.artifacts = true;
    else if (a === "--questionnaire-arms") out.questionnaireArms = true;
    else if (a === "--study-questionnaires") out.studyQuestionnaires = true;
    else if (a === "--force") out.force = true;
    else if (a.startsWith("--company=")) out.companyId = a.slice("--company=".length).trim() || null;
    else if (a.startsWith("--scenarios=")) {
      const v = a.slice("--scenarios=".length).trim().toLowerCase();
      if (v === "sample" || v === "all" || v === "none" || v === "per-category") out.scenarios = v;
      else console.warn(`Unbekannt --scenarios=${v}, verwende none`);
    } else if (a.startsWith("--advisor=")) {
      const v = a.slice("--advisor=".length).trim().toLowerCase();
      if (v === "sample" || v === "none") out.advisor = v;
      else console.warn(`Unbekannt --advisor=${v}, verwende none`);
    }
  }
  return out;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickScore(artifactId: string, key: string, lo: number, hi: number): number {
  return lo + (hashStr(`${artifactId}:${key}`) % (hi - lo + 1));
}

/** Likert 1–7, Standard für Kernskalen etwas über Mitte */
function likert7(seed: string, suffix: string, lo = 4, hi = 6): number {
  return lo + (hashStr(`${seed}:${suffix}`) % (hi - lo + 1));
}

function synthFb2(category: StudyCategoryKey) {
  const s = `fb2:${category}`;
  const core = () => ({
    dq: {
      DQ1: likert7(s, "DQ1"),
      DQ2: likert7(s, "DQ2"),
      DQ3: likert7(s, "DQ3"),
      DQ4: likert7(s, "DQ4"),
    },
    ev: {
      EV1: likert7(s, "EV1"),
      EV2: likert7(s, "EV2"),
      EV3: likert7(s, "EV3"),
      EV4: likert7(s, "EV4"),
    },
    tr: {
      TR1: likert7(s, "TR1"),
      TR2: likert7(s, "TR2"),
      TR3: likert7(s, "TR3"),
    },
    cf: {
      CF1: likert7(s, "CF1"),
      CF2: likert7(s, "CF2"),
      CF3: likert7(s, "CF3", 3, 5),
    },
    cl: {
      CL1: likert7(s, "CL1"),
      CL2: likert7(s, "CL2"),
      CL3: likert7(s, "CL3", 3, 5),
    },
    open: {
      O1: `(${category}) Ohne KI-Tool waren Recherche, Strukturierung und Gewichtung der Indikatoren am zeitaufwändigsten; Entscheide blieben begründbar, aber mit höherer kognitiver Last.`,
      O2: `Checklisten und interne Daten haben geholfen; Lücken blieben bei Marktprognosen.`,
      O3: `Wiederkehrendes Muster: schnelles Urteil möglich, aber langsame Absicherung.`,
    },
  });
  return core();
}

function synthFb3(category: StudyCategoryKey) {
  const s = `fb3:${category}`;
  return {
    dq: { DQ1: likert7(s, "DQ1"), DQ2: likert7(s, "DQ2"), DQ3: likert7(s, "DQ3"), DQ4: likert7(s, "DQ4") },
    ev: { EV1: likert7(s, "EV1"), EV2: likert7(s, "EV2"), EV3: likert7(s, "EV3"), EV4: likert7(s, "EV4") },
    tr: { TR1: likert7(s, "TR1"), TR2: likert7(s, "TR2"), TR3: likert7(s, "TR3") },
    cf: { CF1: likert7(s, "CF1"), CF2: likert7(s, "CF2"), CF3: likert7(s, "CF3") },
    cl: { CL1: likert7(s, "CL1"), CL2: likert7(s, "CL2"), CL3: likert7(s, "CL3") },
  };
}

function synthFb4(category: StudyCategoryKey) {
  const s = `fb4:${category}`;
  return {
    us: { US1: likert7(s, "US1"), US2: likert7(s, "US2"), US3: likert7(s, "US3", 3, 5) },
    tam: {
      PE1: likert7(s, "PE1"),
      PE2: likert7(s, "PE2"),
      EE1: likert7(s, "EE1"),
      EE2: likert7(s, "EE2"),
      SI1: likert7(s, "SI1"),
      SI2: likert7(s, "SI2"),
      FC1: likert7(s, "FC1"),
      FC2: likert7(s, "FC2"),
    },
    open: {
      O1: `(${category}) Mit KI-Tool wirkten Struktur und Varianten schneller verfügbar; Validierungspflicht bleibt.`,
      O2: `Vergleich ohne/mit zeigt höhere Nachvollziehbarkeit im „mit“-Pfad.`,
      O3: `Offene Datenpunkte mussten weiter manuell geprüft werden.`,
    },
    comp: {
      COMP1: likert7(s, "C1"),
      COMP2: likert7(s, "C2"),
      COMP3: likert7(s, "C3"),
      COMP4: likert7(s, "C4"),
      COMP5: likert7(s, "C5"),
    },
    fit: { FIT1: likert7(s, "FIT1"), FIT2: likert7(s, "FIT2"), FIT3: likert7(s, "FIT3") },
    gov: { GOV1: likert7(s, "GOV1"), GOV2: likert7(s, "GOV2"), GOV3: likert7(s, "GOV3") },
    interview: {
      I1: `Relevante Risiken (${category}): Annahmen zu Nachfrage und Kosten.`,
      I2: `Frühwarnsignale wurden plausibel, Felder sollten konkreter beziffert sein.`,
      I3: `Integration: Artefakte wöchentlich im Team reviewen.`,
      I4: `Hemmnis: wenig Zeit für Quercheck externer Daten.`,
      I5: `Vergleichsformat ohne/mit KI erhöhte Transparenz im Entscheidungsprozess.`,
    },
  };
}

/** FB1 strukturell gültiges Demo-Protokoll für Studienausschluss-Analyse */
function synthFb1() {
  return {
    a: {
      A1: "Restaurant / Catering",
      A2: "Deutschland, urban",
      A3: "MVP / frühe Skalierung",
      A4: "Strategische Entscheidungen (Markt & Wachstum)",
      A5: 8,
      A6: "Backfill synthetic — bitte nicht als echte Rekrutierung werten.",
    },
    b: {
      B1: "Alle paar Monate neue Business-Software oder KI-Features im Test.",
      B2: 5,
      B3: 5,
    },
    c: {
      C1: 5,
      C2: 5,
      C3: 4,
      C4: 5,
      C5: 6,
      C6: 4,
    },
    d: {
      D1: "Entscheidungsqualität dokumentieren und revisionssicher dokumentieren.",
      D2: "Transparenz, Nachvollziehbarkeit, Planungssicherheit senken Ungewissheit.",
      D3: "Akzeptierte Risiken: Überanpassung an Modelltexte ohne Fachreview.",
      D4: "Nutzung strukturierter Dokumente im Phasen-Workflow.",
    },
  };
}

/** FB5: nicht nur „4“, sondern bewusste Zustimmung + Freitexte */
function synthFb5Integration() {
  return {
    acc: {
      X1: 6,
      X2: 5,
      X3: 6,
      X4: 5,
      X5: 6,
    },
    open: {
      T1:
        "Am hilfreichsten waren die Artefakte in der Wachstums- und Launch-Phase: schnelle Struktur, klare Ableitungen, nachvollziehbare KPI-Anschlüsse.",
      T2:
        "Integration über wöchentliches Review (30 Min.) plus Freigaben im Phase-Board; KI-Inhalte nur mit Kurzfreigabe der Führung nutzen.",
      T3:
        "Hemnisse: Zeitdruck im Tagesgeschäft, Datenschutz-Unsicherheit, und Gewöhnung an konsistentes Prompting.",
      T4:
        "Hinweis: Diese Einträge stammen aus automatisiertem Studien-Backfill (research-tools/Evaluationspaket sollte entsprechend markiert/exportiert werden).",
    },
  };
}

async function seedMainStudyQuestionnaires(companyId: string, dryRun: boolean, force: boolean) {
  const participant = await getOrCreateStudyParticipant(companyId);

  async function qrExists(questionnaireType: string, category: string | null) {
    const row = await prisma.questionnaireResponse.findFirst({
      where: { participantId: participant.id, questionnaireType, category },
      select: { id: true },
    });
    return Boolean(row);
  }

  if (dryRun) {
    console.log(
      `[dry-run] study questionnaires company=${companyId} participant=${participant.id} force=${force}`,
    );
    return;
  }

  if (force) {
    const del = await prisma.questionnaireResponse.deleteMany({
      where: {
        participantId: participant.id,
        questionnaireType: { in: ["fb1", "fb2", "fb3", "fb4", "fb5"] },
      },
    });
    console.log(`[study] Firma ${companyId}: vorherige Fragebögen gelöscht (${del.count}).`);
  }

  async function insertQr(
    questionnaireType: "fb1" | "fb2" | "fb3" | "fb4" | "fb5",
    category: string | null,
    body: Record<string, unknown>,
  ) {
    const row = await prisma.questionnaireResponse.create({
      data: {
        participantId: participant.id,
        createdBy: null,
        questionnaireType,
        category,
        responsesJson: body as object,
      },
    });
    await createQuestionnaireItems(row.id, questionnaireType, body);
    console.log(`[study] ${companyId} angelegt ${questionnaireType} ${category ?? "—"} (${row.id})`);
  }

  if (!force && (await qrExists("fb1", null))) console.log(`[study] ${companyId} FB1 übersprungen`);
  else await insertQr("fb1", null, synthFb1());

  for (const cat of VALID_STUDY_CATEGORIES) {
    if (!force && (await qrExists("fb2", cat))) console.log(`[study] ${companyId} FB2 ${cat} übersprungen`);
    else await insertQr("fb2", cat, synthFb2(cat));

    if (!force && (await qrExists("fb3", cat))) console.log(`[study] ${companyId} FB3 ${cat} übersprungen`);
    else await insertQr("fb3", cat, synthFb3(cat));

    if (!force && (await qrExists("fb4", cat))) console.log(`[study] ${companyId} FB4 ${cat} übersprungen`);
    else await insertQr("fb4", cat, synthFb4(cat));
  }

  if (!force && (await qrExists("fb5", null))) console.log(`[study] ${companyId} FB5 übersprungen`);
  else await insertQr("fb5", null, synthFb5Integration());

  const fb2Cats = (
    await prisma.questionnaireResponse.findMany({
      where: { participantId: participant.id, questionnaireType: "fb2", category: { not: null } },
      select: { category: true },
    })
  ).map((r) => String(r.category));
  const fb3Cats = (
    await prisma.questionnaireResponse.findMany({
      where: { participantId: participant.id, questionnaireType: "fb3", category: { not: null } },
      select: { category: true },
    })
  ).map((r) => String(r.category));
  const hasFb5 = await qrExists("fb5", null);
  const hasFb1 = await qrExists("fb1", null);
  const fb2Complete = VALID_STUDY_CATEGORIES.every((c) => fb2Cats.includes(c));
  const fb3Complete = VALID_STUDY_CATEGORIES.every((c) => fb3Cats.includes(c));

  await updateStudyParticipantById(participant.id, {
    completedFb1: hasFb1,
    completedFb2BeforeRuns: fb2Cats.length > 0,
    completedFb3AfterRuns: fb3Cats.length > 0,
    completedFb3: fb3Complete,
    completedFb5: hasFb5,
    completedLlmSetup: true,
  });
  console.log(
    `[study] Flags aktualisiert participant=${participant.id} fb2komplett=${fb2Complete} fb3komplett=${fb3Complete} fb5=${hasFb5}`,
  );
}

function buildArtifactEvaluationTexts(artifact: { id: string; title: string; type: string }): {
  strengths: string;
  weaknesses: string;
  improvementSuggestions: string;
  hallucinationNotes: string;
} {
  const t = artifact.title.slice(0, 80);
  const ty = artifact.type.replace(/_/g, " ");
  return {
    strengths: `Inhalt zu „${t}“ (${ty}) ist nachvollziehbar strukturiert und adressiert die üblichen Entscheidungsdimensionen. Quellenhinweise sind größtenteils plausibel; KPI- und Massnahmenblöcke wirken konsistent mit dem angezeigten Kontext.`,
    weaknesses: `Einzelne Empfehlungen bleiben generisch (Branchenfinesse fehlt teilweise). Tiefe bei Risiken/Annahmen könnte erhöht werden; Datums- und Marktbezug sollten bei Bedarf expliziter verankert werden.`,
    improvementSuggestions: `Konkretere Kennzahlen-Ziele, eine kurze Umsetzungs-Reihenfolge (Quick Wins vs. strategische Hebel) und optional ein „Was-wenn“-Szenario würden die Nutzbarkeit erhöhen.`,
    hallucinationNotes: `Keine offensichtlichen Widersprüche zum erwartbaren Profil; falls externe Zitate genutzt werden, einmal Quellen-URL prüfen.`,
  };
}

async function listArtifactsWithoutEvaluation(companyId: string): Promise<Array<{ id: string; title: string; type: string }>> {
  const rows = await prisma.$queryRaw<Array<{ id: string; title: string; type: string }>>`
    SELECT a."id", a."title", a."type"::text AS "type"
    FROM "Artifact" a
    WHERE a."companyId" = ${companyId}
      AND NOT EXISTS (
        SELECT 1 FROM "ArtifactEvaluation" e WHERE e."artifactId" = a."id"
      )
    ORDER BY a."createdAt" ASC
  `;
  return rows;
}

type StudyArm = "ohne_tool" | "mit_tool" | "vergleich";

const ARM_STUDY_IDS: Record<StudyArm, string> = {
  ohne_tool: "DSR-2025-01-SYN-OHNE-TOOL",
  mit_tool: "DSR-2025-01-SYN-MIT-TOOL",
  vergleich: "DSR-2025-01-SYN-VERGLEICH",
};

function fb5PayloadForArm(arm: StudyArm): { acc: Record<string, number>; open: Record<string, string> } {
  const base = {
    ohne_tool: { x: [3, 3, 4, 3, 4] as const, note: "Ohne Assistent: Antworten basieren auf Erfahrung; mehr Unsicherheit bei Details." },
    mit_tool: { x: [6, 5, 6, 6, 5] as const, note: "Mit Assistent: schnellere Strukturierung; Vorschläge waren meist nachvollziehbar." },
    vergleich: { x: [5, 4, 5, 5, 4] as const, note: "Direkter Vergleich: Tool hilft bei Struktur, menschliche Einschätzung bleibt für Kontext kritisch." },
  }[arm];
  const [X1, X2, X3, X4, X5] = base.x;
  return {
    acc: { X1, X2, X3, X4, X5 },
    open: {
      T1: base.note,
      T2: arm === "vergleich" ? "Eigenständig weniger strukturiert, mit Tool konsistenter, aber gelegentlich zu allgemein." : "Passt zur jeweiligen Bedingung ohne künstliche Überzeichnung.",
      T3:
        arm === "ohne_tool"
          ? "Mehr Zeit für Recherche; weniger dokumentierte Alternativen."
          : arm === "mit_tool"
            ? "Hilfreich bei Erstversion; Finale validieren wir immer manuell."
            : "Vergleichsformat hat den größten Lerneffekt für den Entscheidungsprozess.",
      T4: "Keine weiteren Anmerkungen.",
    },
  };
}

async function seedQuestionnaireArms(companyId: string, dryRun: boolean, force: boolean) {
  for (const arm of ["ohne_tool", "mit_tool", "vergleich"] as const) {
    const studyId = ARM_STUDY_IDS[arm];
    const participant = await getOrCreateStudyParticipant(companyId, studyId);
    const existing = await prisma.questionnaireResponse.findFirst({
      where: { participantId: participant.id, questionnaireType: "fb5" },
      select: { id: true },
    });
    if (existing && !force) {
      console.log(
        `[fb5] überspringe Arm ${arm} (Teilnehmer ${participant.id} hat bereits FB5). --force legt zusätzliche Antworten an.`,
      );
      continue;
    }
    const payload = fb5PayloadForArm(arm);
    const responsesJson = {
      ...payload,
      _syntheticStudyArm: arm,
      _syntheticNote: "Automatisch generiert (scripts/backfill-realistic-evaluations.ts)",
    };
    if (dryRun) {
      console.log(`[dry-run] fb5 ${arm} studyId=${studyId} participant=${participant.id}`, responsesJson);
      continue;
    }
    const row = await prisma.questionnaireResponse.create({
      data: {
        participantId: participant.id,
        createdBy: null,
        questionnaireType: "fb5",
        category: null,
        responsesJson: responsesJson as object,
      },
    });
    await createQuestionnaireItems(row.id, "fb5", payload as Record<string, unknown>);
    console.log(`[fb5] angelegt arm=${arm} responseId=${row.id}`);
  }
}

function scenarioTexts(scenarioId: number, q: string) {
  const qClip = q.length > 160 ? `${q.slice(0, 160)}…` : q;
  /** Keine Meta-Präfixe wie „Kurzantwort (59):“ — im UI wie echte Antworten lesbar. */
  const userAnswer = [
    `Zu „${qClip}“ würde ich zuerst Annahmen und Kennzahlenrahmen explizit machen; ohne solide Marktdaten bleibt das Risiko spürbar höher.`,
    `Als Nächstes ein kleines Experiment zur Validierung, danach erst Skalierung. Die eigene Einschätzung ist moderat, weil das Wettbewerbsumfeld unsicher wirkt.`,
  ].join(" ");

  const aiAnswer = [
    `Für die Fragestellung „${qClip}“ empfiehlt sich, Ziel und Entscheidungskriterien zu schärfen, ein passendes Kennzahlenset abzuleiten und daraus priorisierte Maßnahmen abzuleiten.`,
    `Typische Hebel sind Marge, CAC/CLV und Conversion; Quellen konservativ gewichten und offene Punkte transparent benennen.`,
  ].join(" ");

  const userConfidence = 45 + (hashStr(`${scenarioId}:uc`) % 40);
  const aiConfidence = 52 + (hashStr(`${scenarioId}:ac`) % 33);
  /** Demo-Daten: durchgängig KI-Antwort bevorzugen (realistisch für Auswertung ohne künstliche Nutzer-Bias). */
  const userPrefers: "user" | "ai" = "ai";
  const userConfidenceInAi = 62 + (hashStr(`${scenarioId}:uci`) % 28);

  return {
    userAnswer,
    aiAnswer,
    aiSourcesJson: [{ title: "Interne Artefakte / KPI-Set", type: "context" }],
    userPrefers,
    userConfidenceInAi,
    userEvaluationJson: {
      verstaendlichkeit: 4 + (hashStr(`${scenarioId}:v1`) % 2),
      relevanz: 4 + (hashStr(`${scenarioId}:v2`) % 2),
      nuetzlichkeit: 4 + (hashStr(`${scenarioId}:v3`) % 2),
      vollstaendigkeit: 3 + (hashStr(`${scenarioId}:v4`) % 3),
      nachvollziehbarkeit: 4 + (hashStr(`${scenarioId}:v5`) % 2),
      praktikabilitaet: 4 + (hashStr(`${scenarioId}:v6`) % 2),
      vertrauen: 3 + (hashStr(`${scenarioId}:v7`) % 3),
      quellenqualitaet: 4 + (hashStr(`${scenarioId}:v8`) % 2),
    },
    userConfidence,
    aiConfidence,
  };
}

async function seedAdvisorSampleEvaluations(companyId: string, dryRun: boolean, force: boolean) {
  await ensureFeatureEvaluationTable();
  if (dryRun) {
    console.log(`[dry-run] advisor sample für ${companyId}`);
    return;
  }

  const existing = await prisma.$queryRaw<{ c: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS c
      FROM "FeatureEvaluation"
      WHERE "companyId" = ${companyId}
        AND COALESCE("hallucinationNotes", '') LIKE ${`%${ADVISOR_BACKFILL_MARKER}%`}
    `,
  );
  const hasDemo = Number(existing[0]?.c ?? 0) > 0;
  if (hasDemo && !force) {
    console.log(`[advisor] überspringe ${companyId} (bereits Demo-Berater-Evaluationen).`);
    return;
  }
  if (force && hasDemo) {
    await prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM "FeatureEvaluation"
        WHERE "companyId" = ${companyId}
          AND COALESCE("hallucinationNotes", '') LIKE ${`%${ADVISOR_BACKFILL_MARKER}%`}
      `,
    );
  }

  const samples: Array<{
    kind: "chat" | "decisions";
    answerQuality: number;
    sourceQuality: number;
    realism: number;
    clarity: number;
    structure: number;
    hallucinationPresent: boolean;
    strengths: string;
    weaknesses: string;
    improvementSuggestions: string;
  }> = [
    {
      kind: "chat",
      answerQuality: 4,
      sourceQuality: 5,
      realism: 4,
      clarity: 5,
      structure: 4,
      hallucinationPresent: false,
      strengths: "Antwort schlüssig strukturiert, nachvollziehbare Empfehlungen.",
      weaknesses: "Detailtiefe bei Randfällen ausbaufähig.",
      improvementSuggestions: "Bei Unsicherheit explizite Annahmen nennen.",
    },
    {
      kind: "chat",
      answerQuality: 5,
      sourceQuality: 4,
      realism: 5,
      clarity: 4,
      structure: 5,
      hallucinationPresent: false,
      strengths: "Klarer Handlungsablauf.",
      weaknesses: "Weniger Bezug zu internen Dokumenten.",
      improvementSuggestions: "Kontext aus KPI-Set stärker einbeziehen.",
    },
    {
      kind: "decisions",
      answerQuality: 4,
      sourceQuality: 4,
      realism: 4,
      clarity: 4,
      structure: 4,
      hallucinationPresent: false,
      strengths: "Nutzen-Risiko-Abwägung nachvollziehbar.",
      weaknesses: "Quantifizierung teilweise grob.",
      improvementSuggestions: "Sensitivitätsband für zentrale Annahmen.",
    },
    {
      kind: "decisions",
      answerQuality: 3,
      sourceQuality: 4,
      realism: 3,
      clarity: 4,
      structure: 3,
      hallucinationPresent: true,
      strengths: "Relevante Optionen genannt.",
      weaknesses: "Eine Aussage wirkte ohne belastbare Quelle.",
      improvementSuggestions: "Quellen pro Empfehlung verlangen.",
    },
  ];

  for (const row of samples) {
    await createFeatureEvaluation({
      companyId,
      kind: row.kind,
      answerQuality: row.answerQuality,
      sourceQuality: row.sourceQuality,
      realism: row.realism,
      clarity: row.clarity,
      structure: row.structure,
      hallucinationPresent: row.hallucinationPresent,
      hallucinationNotes: row.hallucinationPresent
        ? `${ADVISOR_BACKFILL_MARKER} — Demo: potenziell unbelegte Aussage markiert.`
        : ADVISOR_BACKFILL_MARKER,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      improvementSuggestions: row.improvementSuggestions,
    });
  }
  console.log(`[advisor] 4 Demo-Berater-Evaluationen für ${companyId}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  /** Eine Ziel-Firma für Artefakte / Frageböger / Szenarien mit explizitem oder Default-Company. */
  let companyId = args.companyId;
  const perCategoryAllCompanies = !args.companyId && args.scenarios === "per-category";
  const advisorAllCompanies = !args.companyId && args.advisor === "sample";

  if (!companyId) {
    if (perCategoryAllCompanies) {
      const all = await prisma.company.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
      if (all.length === 0) {
        console.error("Keine Firma in der DB — bitte zuerst anlegen oder --company=<id> setzen.");
        process.exit(1);
      }
      companyId = all[0].id;
      console.log(`[per-category] Ohne --company: Szenario-Demo für ${all.length} Firma(en).`);
    } else if (advisorAllCompanies) {
      const all = await prisma.company.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
      if (all.length === 0) {
        console.error("Keine Firma in der DB — bitte zuerst anlegen oder --company=<id> setzen.");
        process.exit(1);
      }
      companyId = all[0].id;
      console.log(`[advisor] Ohne --company: Berater-Demo für ${all.length} Firma(en).`);
    } else {
      const demo = await prisma.company.findFirst({
        where: { name: "Demo Company" },
        select: { id: true, name: true },
      });
      const first =
        demo ??
        (await prisma.company.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }));
      if (!first) {
        console.error("Keine Firma gefunden — bitte --company=<id> setzen.");
        process.exit(1);
      }
      companyId = first.id;
      console.log(`Nutze Company: ${first.name} (${companyId})${demo ? " [Demo Company bevorzugt]" : ""}`);
    }
  } else {
    const c = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!c) {
      console.error(`Company ${companyId} nicht gefunden.`);
      process.exit(1);
    }
  }

  const cid = companyId!;

  if (
    !args.artifacts &&
    !args.questionnaireArms &&
    args.scenarios === "none" &&
    !args.studyQuestionnaires &&
    args.advisor === "none"
  ) {
    console.log(
      "Hinweis: keine Aktion gewählt. Beispiel:\n  --artifacts\n  --study-questionnaires\n  --questionnaire-arms\n  --scenarios=sample\n  --scenarios=per-category\n  --advisor=sample\n",
    );
    process.exit(0);
  }

  if (args.artifacts) {
    await ensureArtifactEvaluationTable();
    const missing = await listArtifactsWithoutEvaluation(cid);
    console.log(`${missing.length} Artefakte ohne Bewertung.`);
    for (const a of missing) {
      const texts = buildArtifactEvaluationTexts(a);
      const scores = {
        answerQuality: pickScore(a.id, "aq", 3, 5),
        sourceQuality: pickScore(a.id, "sq", 3, 5),
        realism: pickScore(a.id, "rl", 3, 5),
        clarity: pickScore(a.id, "cl", 3, 5),
        structure: pickScore(a.id, "st", 3, 5),
      };
      if (args.dryRun) {
        console.log(`[dry-run] artifact ${a.id} ${a.title}`, scores);
        continue;
      }
      await createArtifactEvaluation({
        artifactId: a.id,
        companyId: cid,
        answerQuality: scores.answerQuality,
        sourceQuality: scores.sourceQuality,
        realism: scores.realism,
        clarity: scores.clarity,
        structure: scores.structure,
        hallucinationPresent: pickScore(a.id, "hall", 0, 10) <= 2,
        hallucinationNotes: texts.hallucinationNotes,
        strengths: texts.strengths,
        weaknesses: texts.weaknesses,
        improvementSuggestions: texts.improvementSuggestions,
        ew_sensible: pickScore(a.id, "ew1", 3, 5),
        ew_clear: pickScore(a.id, "ew2", 3, 5),
        ew_helpful: pickScore(a.id, "ew3", 3, 5),
        ew_notes: "Frühwarn-Indikatoren aus Demo-Backfill.",
        ind_relevant: pickScore(a.id, "ind1", 3, 5),
        ind_notes: "Passt zur Dokumentenkategorie.",
      });
      console.log(`[artifact] evaluation für ${a.id}`);
    }
  }

  if (args.questionnaireArms) {
    await seedQuestionnaireArms(cid, args.dryRun, args.force);
  }

  if (args.studyQuestionnaires) {
    const companyIds = args.companyId
      ? [cid]
      : (await prisma.company.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } })).map((c) => c.id);
    for (const id of companyIds) {
      console.log(`[study] Fragebögen Hauptpfad (studyId Standard) für Company ${id} …`);
      await seedMainStudyQuestionnaires(id, args.dryRun, args.force);
    }
  }

  if (args.scenarios !== "none") {
    const perCategoryIds = new Set([19, 20, 39, 40, 59, 60, 79, 80, 99, 100]);
    const list =
      args.scenarios === "all"
        ? SCENARIOS
        : args.scenarios === "per-category"
          ? SCENARIOS.filter((s) => perCategoryIds.has(s.id))
          : SCENARIOS.filter((s) => s.id <= 5);

    const scenarioCompanyTargets = perCategoryAllCompanies
      ? await prisma.company.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } })
      : [{ id: cid, name: "" }];

    for (const co of scenarioCompanyTargets) {
      if (scenarioCompanyTargets.length > 1) {
        console.log(`[scenario] Company ${co.name || co.id} (${co.id})`);
      }
      for (const s of list) {
        const dup = await prisma.scenarioEvaluation.findFirst({
          where: { companyId: co.id, scenarioId: s.id },
          select: { id: true },
        });
        if (dup && !args.force) {
          console.log(`[scenario] überspringe #${s.id} (bereits vorhanden).`);
          continue;
        }
        const t = scenarioTexts(s.id, s.question);
        if (args.dryRun) {
          console.log(`[dry-run] scenario ${s.id}`, t);
          continue;
        }
        if (args.force && dup) {
          await prisma.scenarioEvaluation.deleteMany({
            where: { companyId: co.id, scenarioId: s.id },
          });
        }
        await prisma.scenarioEvaluation.create({
          data: {
            companyId: co.id,
            createdBy: null,
            scenarioId: s.id,
            userAnswer: t.userAnswer,
            userConfidence: t.userConfidence,
            aiAnswer: t.aiAnswer,
            aiConfidence: t.aiConfidence,
            aiSourcesJson: t.aiSourcesJson as object,
            userPrefers: t.userPrefers,
            userConfidenceInAi: t.userConfidenceInAi,
            userEvaluationJson: t.userEvaluationJson as object,
          },
        });
        console.log(`[scenario] angelegt #${s.id}`);
      }
    }
  }

  if (args.advisor !== "none") {
    const advisorTargets = advisorAllCompanies
      ? await prisma.company.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "asc" } })
      : [{ id: cid, name: "" }];
    for (const co of advisorTargets) {
      if (advisorTargets.length > 1) {
        console.log(`[advisor] Company ${co.name || co.id} (${co.id})`);
      }
      await seedAdvisorSampleEvaluations(co.id, args.dryRun, args.force);
    }
  }

  console.log("Fertig.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
