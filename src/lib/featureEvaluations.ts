import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FeatureEvaluationKind = "decisions" | "chat";

export type FeatureEvaluationRecord = {
  id: string;
  companyId: string;
  kind: string;
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
  createdAt: string;
};

let ensured = false;

export async function ensureFeatureEvaluationTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FeatureEvaluation" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
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
    ALTER TABLE "FeatureEvaluation" ADD COLUMN "sourceQuality" INTEGER NOT NULL DEFAULT 3
  `).catch(() => null);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_FeatureEvaluation_company_kind_createdAt
    ON "FeatureEvaluation" ("companyId", "kind", "createdAt" DESC)
  `);
  ensured = true;
}

export async function createFeatureEvaluation(input: {
  companyId: string;
  kind: FeatureEvaluationKind;
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
}) {
  await ensureFeatureEvaluationTable();
  const id = `fe_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "FeatureEvaluation" (
        "id", "companyId", "kind", "answerQuality", "sourceQuality", "realism", "clarity", "structure",
        "hallucinationPresent", "hallucinationNotes", "strengths", "weaknesses", "improvementSuggestions"
      )
      VALUES (
        ${id}, ${input.companyId}, ${input.kind}, ${input.answerQuality}, ${input.sourceQuality}, ${input.realism}, ${input.clarity}, ${input.structure},
        ${input.hallucinationPresent}, ${input.hallucinationNotes ?? null}, ${input.strengths ?? null}, ${input.weaknesses ?? null}, ${input.improvementSuggestions ?? null}
      )
    `
  );
}

export async function getFeatureEvaluations(
  companyId: string,
  kind: FeatureEvaluationKind
): Promise<FeatureEvaluationRecord[]> {
  await ensureFeatureEvaluationTable();
  return prisma.$queryRaw<FeatureEvaluationRecord[]>(
    Prisma.sql`
      SELECT
        "id", "companyId", "kind", "answerQuality", "sourceQuality", "realism", "clarity", "structure",
        "hallucinationPresent", "hallucinationNotes", "strengths", "weaknesses", "improvementSuggestions", "createdAt"
      FROM "FeatureEvaluation"
      WHERE "companyId" = ${companyId} AND "kind" = ${kind}
      ORDER BY "createdAt" DESC
    `
  );
}
