/**
 * Überblick zu einem StudyParticipant und zugehöriger Company für Evaluations-/Seed-Planung.
 * Aufruf: npx tsx scripts/inspectStudyParticipant.ts <participantId>
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(name: string) {
  const p = resolve(process.cwd(), name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

async function main() {
  const id = process.argv[2]?.trim();
  if (!id) {
    console.error("Usage: npx tsx scripts/inspectStudyParticipant.ts <participantId>");
    process.exit(1);
  }

  const { prisma } = await import("../src/lib/prisma");

  const participant = await prisma.studyParticipant.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      questionnaireResponses: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          questionnaireType: true,
          category: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
    },
  });

  if (!participant) {
    console.log(JSON.stringify({ error: "StudyParticipant nicht gefunden", id }, null, 2));
    process.exit(2);
    return;
  }

  const companyId = participant.companyId;

  const [useCases, scenarios, artifactCount] = await Promise.all([
    prisma.useCaseEvaluation.count({ where: { companyId } }),
    prisma.scenarioEvaluation.count({ where: { companyId } }),
    prisma.artifact.count({ where: { companyId } }),
  ]);

  type Q = {
    questionnaireType: string;
    categories: Record<string, number>; // category -> latest response item count snapshot
    responseCount: number;
  };

  const byType = new Map<string, Q>();

  const detailed = participant.questionnaireResponses.map((r) => ({
    type: r.questionnaireType,
    category: r.category,
    items: r._count.items,
    at: r.createdAt.toISOString(),
  }));

  for (const r of participant.questionnaireResponses) {
    const t = r.questionnaireType;
    let q = byType.get(t);
    if (!q) {
      q = { questionnaireType: t, categories: {}, responseCount: 0 };
      byType.set(t, q);
    }
    q.responseCount += 1;
    const c = r.category ?? "null";
    q.categories[c] = r._count.items;
  }

  const REPORT = {
    participantId: participant.id,
    companyId,
    companyName: participant.company.name,
    flags: {
      completedFb1: participant.completedFb1,
      completedFb2BeforeRuns: participant.completedFb2BeforeRuns,
      completedFb3AfterRuns: participant.completedFb3AfterRuns,
      completedFb5: participant.completedFb5,
      completedLlmSetup: participant.completedLlmSetup,
    },
    questionnaireSummary: Object.fromEntries(
      [...byType.entries()].map(([k, v]) => [k, v])
    ),
    questionnaireRows: detailed,
    companyEvaluationCounts: {
      useCaseEvaluations: useCases,
      scenarioEvaluations: scenarios,
      artifacts: artifactCount,
    },
  };

  console.log(JSON.stringify(REPORT, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
