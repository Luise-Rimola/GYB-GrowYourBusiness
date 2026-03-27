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

let ensured = false;

export async function ensureArtifactEvaluationTable() {
  if (ensured) return;
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
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ArtifactEvaluation" ADD COLUMN "sourceQuality" INTEGER NOT NULL DEFAULT 3
  `).catch(() => null);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_ArtifactEvaluation_artifactId_createdAt
    ON "ArtifactEvaluation" ("artifactId", "createdAt" DESC)
  `);
  for (const col of [
    "ew_sensible INTEGER",
    "ew_clear INTEGER",
    "ew_helpful INTEGER",
    "ew_notes TEXT",
    "ind_relevant INTEGER",
    "ind_notes TEXT",
  ]) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ArtifactEvaluation" ADD COLUMN ${col}`).catch(() => null);
  }
  ensured = true;
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

