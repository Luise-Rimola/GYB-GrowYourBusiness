import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlanningPhaseReleasedMap = Record<string, boolean>;

function normalizeReleasedMap(raw: unknown): PlanningPhaseReleasedMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PlanningPhaseReleasedMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === true) out[k] = true;
  }
  return out;
}

export async function getPlanningPhaseReleasedMap(companyId: string): Promise<PlanningPhaseReleasedMap> {
  const delegate = (prisma as any).companySettings;
  if (delegate?.findUnique) {
    try {
      const settings = await delegate.findUnique({
        where: { companyId },
        select: { planningPhaseArtifactsReleased: true },
      });
      return normalizeReleasedMap(settings?.planningPhaseArtifactsReleased ?? null);
    } catch {
      // fall through to raw fallback
    }
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ planningPhaseArtifactsReleased: unknown }>>(
      Prisma.sql`SELECT planningPhaseArtifactsReleased FROM "CompanySettings" WHERE companyId = ${companyId} LIMIT 1`
    );
    const raw = rows[0]?.planningPhaseArtifactsReleased ?? null;
    const parsed = typeof raw === "string" ? safeParseJson(raw) : raw;
    return normalizeReleasedMap(parsed);
  } catch {
    return {};
  }
}

export async function setPlanningPhaseArtifactRelease(
  companyId: string,
  phaseId: string,
  released: boolean
): Promise<void> {
  const current = await getPlanningPhaseReleasedMap(companyId);
  if (released) {
    current[phaseId] = true;
  } else {
    delete current[phaseId];
  }
  const delegate = (prisma as any).companySettings;
  if (delegate?.upsert) {
    try {
      await delegate.upsert({
        where: { companyId },
        create: {
          companyId,
          planningPhaseArtifactsReleased: current,
        },
        update: {
          planningPhaseArtifactsReleased: current,
        },
      });
      return;
    } catch {
      // fall through to raw fallback
    }
  }

  try {
    const payload = JSON.stringify(current);
    const existing = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM "CompanySettings" WHERE companyId = ${companyId} LIMIT 1`
    );
    if (existing[0]?.id) {
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "CompanySettings" SET planningPhaseArtifactsReleased = ${payload} WHERE companyId = ${companyId}`
      );
    } else {
      await prisma.$executeRaw(
        Prisma.sql`INSERT INTO "CompanySettings" (id, companyId, planningPhaseArtifactsReleased, createdAt, updatedAt)
                   VALUES (${`cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}, ${companyId}, ${payload}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      );
    }
  } catch {
    // If table/column not available yet, do not crash the request.
  }
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
