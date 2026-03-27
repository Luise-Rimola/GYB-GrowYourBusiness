import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function createQuestionnaireResponse(params: {
  participantId: string;
  questionnaireType: string;
  category: string | null;
  responsesJson: Record<string, unknown>;
}) {
  const delegate = (prisma as any).questionnaireResponse;
  if (delegate?.create) {
    return delegate.create({
      data: {
        participantId: params.participantId,
        questionnaireType: params.questionnaireType,
        category: params.category,
        responsesJson: params.responsesJson,
      },
    });
  }

  const id = randomUUID();
  const contentStr = JSON.stringify(params.responsesJson ?? {});
  await prisma.$executeRaw(
    Prisma.sql`INSERT INTO "QuestionnaireResponse" ("id","participantId","questionnaireType","category","responsesJson","createdAt")
               VALUES (${id}, ${params.participantId}, ${params.questionnaireType}, ${params.category}, ${contentStr}, CURRENT_TIMESTAMP)`
  );
  return { id };
}

/** Letzte gespeicherte Antwort für Typ + optional Kategorie (neuestes `createdAt`). */
export async function getLatestQuestionnaireResponseJson(params: {
  participantId: string;
  questionnaireType: string;
  category: string | null;
}): Promise<unknown | null> {
  const delegate = (prisma as any).questionnaireResponse;
  if (delegate?.findFirst) {
    const row = await delegate.findFirst({
      where: {
        participantId: params.participantId,
        questionnaireType: params.questionnaireType,
        category: params.category,
      },
      orderBy: { createdAt: "desc" },
      select: { responsesJson: true },
    });
    return row?.responsesJson ?? null;
  }

  if (params.category === null) {
    const rows = await prisma.$queryRaw<Array<{ responsesJson: unknown }>>`
      SELECT responsesJson FROM QuestionnaireResponse
      WHERE participantId = ${params.participantId}
        AND questionnaireType = ${params.questionnaireType}
        AND category IS NULL
      ORDER BY createdAt DESC
      LIMIT 1
    `;
    return rows[0]?.responsesJson ?? null;
  }

  const rows = await prisma.$queryRaw<Array<{ responsesJson: unknown }>>`
    SELECT responsesJson FROM QuestionnaireResponse
    WHERE participantId = ${params.participantId}
      AND questionnaireType = ${params.questionnaireType}
      AND category = ${params.category}
    ORDER BY createdAt DESC
    LIMIT 1
  `;
  return rows[0]?.responsesJson ?? null;
}

function parseJsonField(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function takeNumericGroup(
  grp: unknown,
  keys: string[],
  out: Partial<Record<string, number | string>>
) {
  if (!grp || typeof grp !== "object") return;
  const g = grp as Record<string, unknown>;
  for (const k of keys) {
    const v = g[k];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
}

/** Flache Default-Werte für `Fragebogen2Form` aus gespeichertem `responsesJson`. */
export function fb2ResponsesJsonToFormDefaults(json: unknown): Partial<Record<string, number | string>> {
  const out: Partial<Record<string, number | string>> = {};
  const parsed = parseJsonField(json);
  if (!parsed || typeof parsed !== "object") return out;
  const r = parsed as Record<string, unknown>;
  takeNumericGroup(r.dq, ["DQ1", "DQ2", "DQ3", "DQ4"], out);
  takeNumericGroup(r.ev, ["EV1", "EV2", "EV3", "EV4"], out);
  takeNumericGroup(r.tr, ["TR1", "TR2", "TR3"], out);
  takeNumericGroup(r.cf, ["CF1", "CF2", "CF3"], out);
  takeNumericGroup(r.cl, ["CL1", "CL2", "CL3"], out);
  if (r.open && typeof r.open === "object") {
    const o = r.open as Record<string, unknown>;
    for (const k of ["O1", "O2", "O3"] as const) {
      if (o[k] != null) out[k] = String(o[k]);
    }
  }
  return out;
}

/** Flache Default-Werte für `Fragebogen3Form` aus gespeichertem `responsesJson`. */
export function fb3ResponsesJsonToFormDefaults(json: unknown): Partial<Record<string, number | string>> {
  const out: Partial<Record<string, number | string>> = {};
  const parsed = parseJsonField(json);
  if (!parsed || typeof parsed !== "object") return out;
  const r = parsed as Record<string, unknown>;
  takeNumericGroup(r.dq, ["DQ1", "DQ2", "DQ3", "DQ4"], out);
  takeNumericGroup(r.ev, ["EV1", "EV2", "EV3", "EV4"], out);
  takeNumericGroup(r.tr, ["TR1", "TR2", "TR3"], out);
  takeNumericGroup(r.cf, ["CF1", "CF2", "CF3"], out);
  takeNumericGroup(r.cl, ["CL1", "CL2", "CL3"], out);
  takeNumericGroup(r.us, ["US1", "US2", "US3"], out);
  takeNumericGroup(r.tam, ["PE1", "PE2", "EE1", "EE2", "SI1", "SI2", "FC1", "FC2"], out);
  takeNumericGroup(r.comp, ["COMP1", "COMP2", "COMP3", "COMP4", "COMP5"], out);
  takeNumericGroup(r.fit, ["FIT1", "FIT2", "FIT3"], out);
  takeNumericGroup(r.gov, ["GOV1", "GOV2", "GOV3"], out);
  if (r.open && typeof r.open === "object") {
    const o = r.open as Record<string, unknown>;
    for (const k of ["O1", "O2", "O3"] as const) {
      if (o[k] != null) out[k] = String(o[k]);
    }
    if (!out.O1 && o.E1 != null) out.O1 = String(o.E1);
    if (!out.O2 && o.E2 != null) out.O2 = String(o.E2);
    if (!out.O3 && o.E3 != null) out.O3 = String(o.E3);
  }
  return out;
}

/** Flache Default-Werte für `Fragebogen4Form` aus gespeichertem `responsesJson`. */
export function fb4ResponsesJsonToFormDefaults(json: unknown): Partial<Record<string, number | string>> {
  const out: Partial<Record<string, number | string>> = {};
  const parsed = parseJsonField(json);
  if (!parsed || typeof parsed !== "object") return out;
  const r = parsed as Record<string, unknown>;
  takeNumericGroup(r.us, ["US1", "US2", "US3"], out);
  takeNumericGroup(r.tam, ["PE1", "PE2", "EE1", "EE2", "SI1", "SI2", "FC1", "FC2"], out);
  takeNumericGroup(r.comp, ["COMP1", "COMP2", "COMP3", "COMP4", "COMP5"], out);
  takeNumericGroup(r.fit, ["FIT1", "FIT2", "FIT3"], out);
  takeNumericGroup(r.gov, ["GOV1", "GOV2", "GOV3"], out);
  if (r.open && typeof r.open === "object") {
    const o = r.open as Record<string, unknown>;
    for (const k of ["O1", "O2", "O3"] as const) {
      if (o[k] != null) out[k] = String(o[k]);
    }
  }
  if (r.interview && typeof r.interview === "object") {
    const o = r.interview as Record<string, unknown>;
    for (const k of ["I1", "I2", "I3", "I4", "I5"] as const) {
      if (o[k] != null) out[k] = String(o[k]);
    }
  }
  return out;
}

/** Defaults für Fragebogen 5 (Abschluss) */
export function fb5ResponsesJsonToFormDefaults(json: unknown): Partial<Record<string, number | string>> {
  const out: Partial<Record<string, number | string>> = {};
  const parsed = parseJsonField(json);
  if (!parsed || typeof parsed !== "object") return out;
  const r = parsed as Record<string, unknown>;
  takeNumericGroup(r.acc, ["X1", "X2", "X3", "X4", "X5"], out);
  if (r.open && typeof r.open === "object") {
    const o = r.open as Record<string, unknown>;
    for (const k of ["T1", "T2", "T3", "T4"] as const) {
      if (o[k] != null) out[k] = String(o[k]);
    }
  }
  return out;
}

