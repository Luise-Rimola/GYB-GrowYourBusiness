import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ArtifactEvaluationRecord = {
  id: string;
  artifactId: string;
  companyId: string;
  answerQuality: number;
  sourceQuality: number;
  realism: number;
  clarity: number;
  structure: number;
  hallucinationPresent: boolean;
  hallucinationNotes: string | null;
  strengths: string | null;
  weaknesses: string | null;
  improvementSuggestions: string | null;
  /** Optional: Frühwarnsignale / Indikatoren (1–5 oder null) */
  ew_sensible: number | null;
  ew_clear: number | null;
  ew_helpful: number | null;
  ew_notes: string | null;
  ind_relevant: number | null;
  ind_notes: string | null;
  createdAt: string;
};

/** Wie in `/artifacts`: ein sichtbares Dokument pro Workflow + Artefakt-Typ. */
export function workflowTypeKeyForArtifact<A extends { type: string; run?: { workflowKey: string | null } | null }>(
  a: A,
): string {
  return `${a.run?.workflowKey ?? "no-workflow"}:${a.type}`;
}

/** Behält nur das erste Element pro Workflow+Typ (`artifacts` absteigend nach `createdAt`, jüngstes zuerst). */
export function pickNewestArtifactPerWorkflowAndType<
  A extends { type: string; run?: { workflowKey: string | null } | null },
>(artifactsNewestFirst: A[]): A[] {
  const seen = new Set<string>();
  const out: A[] = [];
  for (const a of artifactsNewestFirst) {
    const k = workflowTypeKeyForArtifact(a);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

/** Eine garantierte Ausführung pro Prozess; vermeidet parallele DDL-Läufe in Dev/HMR. */
let ensureArtifactEvaluationTablePromise: Promise<void> | null = null;

async function runEnsureArtifactEvaluationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ArtifactEvaluation" (
      "id" TEXT PRIMARY KEY,
      "artifactId" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "answerQuality" INTEGER NOT NULL,
      "sourceQuality" INTEGER NOT NULL DEFAULT 3,
      "realism" INTEGER NOT NULL,
      "clarity" INTEGER NOT NULL,
      "structure" INTEGER NOT NULL,
      "hallucinationPresent" BOOLEAN NOT NULL DEFAULT FALSE,
      "hallucinationNotes" TEXT,
      "strengths" TEXT,
      "weaknesses" TEXT,
      "improvementSuggestions" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Bestehende DBs ohne Spalte: keine Fehler-/Logs mehr bei „bereits vorhanden“ (PostgreSQL 11+).
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ArtifactEvaluation"
    ADD COLUMN IF NOT EXISTS "sourceQuality" INTEGER NOT NULL DEFAULT 3
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_ArtifactEvaluation_artifactId_createdAt
    ON "ArtifactEvaluation" ("artifactId", "createdAt" DESC)
  `);
  for (const { name, typeSql } of [
    { name: "ew_sensible", typeSql: "INTEGER" },
    { name: "ew_clear", typeSql: "INTEGER" },
    { name: "ew_helpful", typeSql: "INTEGER" },
    { name: "ew_notes", typeSql: "TEXT" },
    { name: "ind_relevant", typeSql: "INTEGER" },
    { name: "ind_notes", typeSql: "TEXT" },
  ] as const) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "ArtifactEvaluation" ADD COLUMN IF NOT EXISTS "${name}" ${typeSql}`
    );
  }
}

export async function ensureArtifactEvaluationTable() {
  if (!ensureArtifactEvaluationTablePromise) {
    ensureArtifactEvaluationTablePromise = runEnsureArtifactEvaluationTable();
  }
  await ensureArtifactEvaluationTablePromise;
}

export async function createArtifactEvaluation(input: {
  artifactId: string;
  companyId: string;
  answerQuality: number;
  sourceQuality: number;
  realism: number;
  clarity: number;
  structure: number;
  hallucinationPresent: boolean;
  hallucinationNotes?: string;
  strengths?: string;
  weaknesses?: string;
  improvementSuggestions?: string;
  ew_sensible?: number | null;
  ew_clear?: number | null;
  ew_helpful?: number | null;
  ew_notes?: string | null;
  ind_relevant?: number | null;
  ind_notes?: string | null;
}) {
  await ensureArtifactEvaluationTable();
  const id = `ae_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "ArtifactEvaluation" (
        "id", "artifactId", "companyId", "answerQuality", "realism", "clarity", "structure",
        "sourceQuality",
        "hallucinationPresent", "hallucinationNotes", "strengths", "weaknesses", "improvementSuggestions",
        "ew_sensible", "ew_clear", "ew_helpful", "ew_notes", "ind_relevant", "ind_notes"
      )
      VALUES (
        ${id}, ${input.artifactId}, ${input.companyId}, ${input.answerQuality}, ${input.realism}, ${input.clarity}, ${input.structure},
        ${input.sourceQuality},
        ${input.hallucinationPresent}, ${input.hallucinationNotes ?? null}, ${input.strengths ?? null}, ${input.weaknesses ?? null}, ${input.improvementSuggestions ?? null},
        ${input.ew_sensible ?? null}, ${input.ew_clear ?? null}, ${input.ew_helpful ?? null}, ${input.ew_notes ?? null}, ${input.ind_relevant ?? null}, ${input.ind_notes ?? null}
      )
    `
  );
}

export async function getArtifactEvaluations(artifactId: string): Promise<ArtifactEvaluationRecord[]> {
  await ensureArtifactEvaluationTable();
  return prisma.$queryRaw<ArtifactEvaluationRecord[]>(
    Prisma.sql`
      SELECT
        "id", "artifactId", "companyId", "answerQuality", "realism", "clarity", "structure",
        "sourceQuality",
        "hallucinationPresent", "hallucinationNotes", "strengths", "weaknesses", "improvementSuggestions",
        "ew_sensible", "ew_clear", "ew_helpful", "ew_notes", "ind_relevant", "ind_notes",
        "createdAt"
      FROM "ArtifactEvaluation"
      WHERE "artifactId" = ${artifactId}
      ORDER BY "createdAt" DESC
    `
  );
}

export async function getArtifactEvaluationsByCompany(companyId: string): Promise<ArtifactEvaluationRecord[]> {
  await ensureArtifactEvaluationTable();
  return prisma.$queryRaw<ArtifactEvaluationRecord[]>(
    Prisma.sql`
      SELECT
        "id", "artifactId", "companyId", "answerQuality", "realism", "clarity", "structure",
        "sourceQuality", "hallucinationPresent", "hallucinationNotes", "strengths", "weaknesses", "improvementSuggestions",
        "ew_sensible", "ew_clear", "ew_helpful", "ew_notes", "ind_relevant", "ind_notes",
        "createdAt"
      FROM "ArtifactEvaluation"
      WHERE "companyId" = ${companyId}
      ORDER BY "createdAt" DESC
    `
  );
}

