import { prisma } from "@/lib/prisma";

type StudyParticipantFlags = {
  completedFb1?: boolean;
  completedFb2BeforeRuns?: boolean;
  completedFb3AfterRuns?: boolean;
  completedFb3?: boolean;
  completedFb5?: boolean;
  completedLlmSetup?: boolean;
};

const DEFAULT_STUDY_ID = "DSR-2025-01";

function toDbBool(v: boolean) {
  // SQLite stores booleans as 0/1
  return v ? 1 : 0;
}

function fromDbBool(v: unknown) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return Boolean(v);
}

function participantFromRow(row: any) {
  return {
    ...row,
    completedFb1: fromDbBool(row.completedFb1),
    completedFb2BeforeRuns: fromDbBool(row.completedFb2BeforeRuns),
    completedFb3AfterRuns: fromDbBool(row.completedFb3AfterRuns),
    completedFb3: fromDbBool(row.completedFb3),
    completedFb5: fromDbBool(row.completedFb5 ?? false),
    completedLlmSetup: fromDbBool(row.completedLlmSetup ?? false),
  };
}

async function rawFindStudyParticipant(companyId: string, studyId: string) {
  const rows = (await (prisma as any).$queryRaw<any[]>`
    SELECT *
    FROM "StudyParticipant"
    WHERE "companyId" = ${companyId} AND "studyId" = ${studyId}
    LIMIT 1
  `) as any[];
  return rows[0] ? participantFromRow(rows[0]) : null;
}

async function rawCreateStudyParticipant(companyId: string, studyId: string) {
  const { randomUUID } = await import("crypto");
  const id = randomUUID();

  try {
    await (prisma as any).$executeRaw<any>`
      INSERT INTO "StudyParticipant"
        ("id","companyId","studyId","externalId","completedFb1","completedFb2BeforeRuns","completedFb3AfterRuns","completedFb3","completedFb5","completedLlmSetup")
      VALUES
        (${id}, ${companyId}, ${studyId}, NULL, 0, 0, 0, 0, 0, 0)
    `;
  } catch (e) {
    // In case of race-condition: row might already exist.
  }

  const byId = (await (prisma as any).$queryRaw<any[]>`
    SELECT *
    FROM "StudyParticipant"
    WHERE "id" = ${id}
    LIMIT 1
  `) as any[];
  if (byId[0]) return participantFromRow(byId[0]);

  // Fallback: select by unique fields
  const existing = await rawFindStudyParticipant(companyId, studyId);
  if (existing) return existing;
  throw new Error("Failed to create StudyParticipant (raw fallback).");
}

async function rawUpdateStudyParticipantById(participantId: string, data: StudyParticipantFlags) {
  const sets: string[] = [];
  const values: any[] = [];

  if (data.completedFb1 !== undefined) {
    sets.push(`"completedFb1" = ?`);
    values.push(toDbBool(data.completedFb1));
  }
  if (data.completedFb2BeforeRuns !== undefined) {
    sets.push(`"completedFb2BeforeRuns" = ?`);
    values.push(toDbBool(data.completedFb2BeforeRuns));
  }
  if (data.completedFb3AfterRuns !== undefined) {
    sets.push(`"completedFb3AfterRuns" = ?`);
    values.push(toDbBool(data.completedFb3AfterRuns));
  }
  if (data.completedFb3 !== undefined) {
    sets.push(`"completedFb3" = ?`);
    values.push(toDbBool(data.completedFb3));
  }
  if (data.completedFb5 !== undefined) {
    sets.push(`"completedFb5" = ?`);
    values.push(toDbBool(data.completedFb5));
  }
  if (data.completedLlmSetup !== undefined) {
    sets.push(`"completedLlmSetup" = ?`);
    values.push(toDbBool(data.completedLlmSetup));
  }

  if (sets.length === 0) return;

  const sql = `
    UPDATE "StudyParticipant"
    SET ${sets.join(", ")}
    WHERE "id" = ?
  `;

  const execUnsafe = (prisma as any).$executeRawUnsafe?.bind(prisma);
  if (!execUnsafe) {
    throw new Error("Prisma $executeRawUnsafe not available for raw fallback update.");
  }
  await execUnsafe(sql, ...values, participantId);
}

export async function updateStudyParticipantById(
  participantId: string,
  data: StudyParticipantFlags
) {
  const delegate = (prisma as any).studyParticipant;
  if (delegate?.update) {
    // Use Prisma delegate when available
    try {
      return await delegate.update({
        where: { id: participantId },
        data: {
          ...(data.completedFb1 !== undefined ? { completedFb1: data.completedFb1 } : {}),
          ...(data.completedFb2BeforeRuns !== undefined
            ? { completedFb2BeforeRuns: data.completedFb2BeforeRuns }
            : {}),
          ...(data.completedFb3AfterRuns !== undefined
            ? { completedFb3AfterRuns: data.completedFb3AfterRuns }
            : {}),
          ...(data.completedFb3 !== undefined ? { completedFb3: data.completedFb3 } : {}),
          ...(data.completedFb5 !== undefined ? { completedFb5: data.completedFb5 } : {}),
          ...(data.completedLlmSetup !== undefined ? { completedLlmSetup: data.completedLlmSetup } : {}),
        },
      });
    } catch {
      // Fall through to raw fallback when connector is temporarily unavailable.
    }
  }

  // Raw fallback (Prisma client missing model delegate)
  return rawUpdateStudyParticipantById(participantId, data);
}

export async function getOrCreateStudyParticipant(
  companyId: string,
  studyId = DEFAULT_STUDY_ID
) {
  const delegate = (prisma as any).studyParticipant;

  if (delegate?.findUnique && delegate?.create) {
    try {
      const existing = await delegate.findUnique({
        where: {
          companyId_studyId: { companyId, studyId },
        },
      });
      if (existing) return existing;
      return await delegate.create({
        data: {
          companyId,
          studyId,
        },
      });
    } catch {
      // Fall through to raw fallback when connector is temporarily unavailable.
    }
  }

  // Raw fallback (Prisma client missing model delegate)
  const existing = await rawFindStudyParticipant(companyId, studyId);
  if (existing) return existing;
  return rawCreateStudyParticipant(companyId, studyId);
}
