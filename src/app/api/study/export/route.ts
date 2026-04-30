import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyForApi } from "@/lib/companyContext";

/** Reverse-Coding: C5, CF3, CL1, CL3, US3, GOV1 (Skala 1–7 → 8 - value, DSR-Dokument) */
const REVERSE_ITEMS = new Set(["C5", "CF3", "CL1", "CL3", "US3", "GOV1"]);

type ResponseItemValue = { valueNum: number | null; valueStr: string | null };

type ResponseWithItems = {
  id: string;
  questionnaireType: string;
  category: string | null;
  createdAt: Date;
  items: Array<{ itemKey: string; valueNum: number | null; valueStr: string | null }>;
};

type StudyParticipantWithResponses = {
  id: string;
  externalId: string | null;
  createdAt: Date;
  questionnaireResponses: ResponseWithItems[];
};

type RawStudyExportRow = {
  participantId: string;
  externalId: string | null;
  participantCreatedAt: string | Date | null;
  responseId: string | null;
  questionnaireType: string | null;
  category: string | null;
  responseCreatedAt: string | Date | null;
  itemKey: string | null;
  valueNum: number | string | null;
  valueStr: string | null;
};

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function applyReverse(key: string, value: number): number {
  if (REVERSE_ITEMS.has(key) && value >= 1 && value <= 7) {
    return 8 - value;
  }
  return value;
}

export async function GET() {
  const auth = await getCompanyForApi();
  if (!auth) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { company } = auth;

  // Robust exportieren: wenn studyParticipant/questionnaireResponseItem-Delegates zur Laufzeit fehlen,
  // holen wir alles per SQL aus SQLite.
  const db = prisma as typeof prisma & {
    studyParticipant?: {
      findMany: (args: {
        where: { companyId: string };
        include: { questionnaireResponses: { include: { items: true }; orderBy: { createdAt: "asc" } } };
        orderBy: { createdAt: "asc" };
      }) => Promise<StudyParticipantWithResponses[]>;
    };
    questionnaireResponseItem?: unknown;
    $queryRaw: <T>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  };
  const hasStudyParticipantDelegate = Boolean(db.studyParticipant?.findMany);
  const hasQuestionnaireResponseItemDelegate = Boolean(db.questionnaireResponseItem);

  const participants: Array<{
    id: string;
    externalId: string | null;
    createdAt: Date;
    responses: Array<{
      id: string;
      questionnaireType: string;
      category: string | null;
      createdAt: Date;
      itemMap: Map<string, { valueNum: number | null; valueStr: string | null }>;
    }>;
  }> = [];

  if (hasStudyParticipantDelegate && hasQuestionnaireResponseItemDelegate) {
    // Standard-Path (Delegates vorhanden)
    const data = await db.studyParticipant!.findMany({
      where: { companyId: company.id },
      include: {
        questionnaireResponses: {
          include: { items: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const p of data) {
      const responses = (p.questionnaireResponses ?? []).map((r) => {
        const itemMap = new Map(
          (r.items ?? []).map((it) => [
            it.itemKey,
            { valueNum: it.valueNum, valueStr: it.valueStr } satisfies ResponseItemValue,
          ])
        );
        return {
          id: r.id,
          questionnaireType: r.questionnaireType,
          category: r.category ?? null,
          createdAt: r.createdAt,
          itemMap,
        };
      });

      participants.push({
        id: p.id,
        externalId: p.externalId ?? null,
        createdAt: p.createdAt,
        responses,
      });
    }
  } else {
    // Fallback-Path: per SQL exportieren (keine Delegates nötig)
    const rawRows = await db.$queryRaw<RawStudyExportRow[]>`
      SELECT
        sp."id"              AS "participantId",
        sp."externalId"     AS "externalId",
        sp."createdAt"      AS "participantCreatedAt",
        qr."id"              AS "responseId",
        qr."questionnaireType" AS "questionnaireType",
        qr."category"       AS "category",
        qr."createdAt"      AS "responseCreatedAt",
        qri."itemKey"       AS "itemKey",
        qri."valueNum"      AS "valueNum",
        qri."valueStr"      AS "valueStr"
      FROM "StudyParticipant" sp
      LEFT JOIN "QuestionnaireResponse" qr
        ON qr."participantId" = sp."id"
      LEFT JOIN "QuestionnaireResponseItem" qri
        ON qri."responseId" = qr."id"
      WHERE sp."companyId" = ${company.id}
      ORDER BY sp."id" ASC, qr."createdAt" ASC, qri."itemKey" ASC
    `;

    const participantMap = new Map<
      string,
      {
        id: string;
        externalId: string | null;
        createdAt: Date;
        responseMap: Map<
          string,
          {
            id: string;
            questionnaireType: string;
            category: string | null;
            createdAt: Date;
            itemMap: Map<string, { valueNum: number | null; valueStr: string | null }>;
          }
        >;
      }
    >();

    for (const row of rawRows) {
      if (!participantMap.has(row.participantId)) {
        participantMap.set(row.participantId, {
          id: row.participantId,
          externalId: row.externalId ?? null,
          createdAt: row.participantCreatedAt ? new Date(row.participantCreatedAt) : new Date(),
          responseMap: new Map(),
        });
      }

      const p = participantMap.get(row.participantId)!;

      // response can be null when no questionnaireResponses exist yet
      if (row.responseId) {
        if (!p.responseMap.has(row.responseId)) {
          p.responseMap.set(row.responseId, {
            id: row.responseId,
            questionnaireType: row.questionnaireType ?? "",
            category: row.category ?? null,
            createdAt: row.responseCreatedAt ? new Date(row.responseCreatedAt) : new Date(),
            itemMap: new Map(),
          });
        }

        const r = p.responseMap.get(row.responseId)!;
        if (row.itemKey) {
          r.itemMap.set(row.itemKey, {
            valueNum: row.valueNum === null ? null : Number(row.valueNum),
            valueStr: row.valueStr === null ? null : String(row.valueStr),
          });
        }
      }
    }

    for (const p of participantMap.values()) {
      participants.push({
        id: p.id,
        externalId: p.externalId,
        createdAt: p.createdAt,
        responses: Array.from(p.responseMap.values()),
      });
    }
  }

  const rows: string[][] = [];

  // SPSS-friendly "wide" format:
  // - one row per participant
  // - deterministic variable names (e.g. fb2_mgb_dq1)
  // - latest response wins for each questionnaire+category
  const latestByParticipantAndForm = new Map<
    string,
    Map<string, { createdAt: Date; itemMap: Map<string, { valueNum: number | null; valueStr: string | null }> }>
  >();
  const formToItems = new Map<string, Set<string>>();

  for (const p of participants) {
    const formMap = new Map<string, { createdAt: Date; itemMap: Map<string, { valueNum: number | null; valueStr: string | null }> }>();
    for (const r of p.responses) {
      const formKey = responseFormKey(r.questionnaireType, r.category);
      const prev = formMap.get(formKey);
      if (!prev || r.createdAt > prev.createdAt) {
        formMap.set(formKey, { createdAt: r.createdAt, itemMap: r.itemMap });
      }
      if (!formToItems.has(formKey)) formToItems.set(formKey, new Set<string>());
      for (const itemKey of r.itemMap.keys()) formToItems.get(formKey)!.add(itemKey);
    }
    latestByParticipantAndForm.set(p.id, formMap);
  }

  const formKeys = Array.from(formToItems.keys()).sort(compareFormKeys);
  const variableColumns: Array<{ col: string; formKey: string; itemKey?: string; meta?: "created_at" }> = [];
  for (const formKey of formKeys) {
    variableColumns.push({ col: `${formKey}_created_at`, formKey, meta: "created_at" });
    const itemKeys = Array.from(formToItems.get(formKey) ?? []).sort();
    for (const itemKey of itemKeys) {
      variableColumns.push({ col: `${formKey}_${normalizeItemKey(itemKey)}`, formKey, itemKey });
    }
  }

  const header = [
    "participant_id",
    "external_id",
    "participant_created_at",
    ...variableColumns.map((c) => c.col),
  ];
  rows.push(header);

  for (const p of participants) {
    const formMap = latestByParticipantAndForm.get(p.id) ?? new Map();
    const valueCols = variableColumns.map((c) => {
      const form = formMap.get(c.formKey);
      if (!form) return "";
      if (c.meta === "created_at") return form.createdAt.toISOString();
      const item = form.itemMap.get(c.itemKey!);
      if (!item) return "";
      if (item.valueNum !== null) return String(applyReverse(c.itemKey!, item.valueNum));
      return item.valueStr ?? "";
    });

    rows.push([
      p.id,
      p.externalId ?? "",
      p.createdAt.toISOString(),
      ...valueCols,
    ]);
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="study-export.csv"',
    },
  });
}

function normalizeCategory(category: string | null | undefined): string {
  if (!category) return "global";
  const map: Record<string, string> = {
    markt_geschaeftsmodell: "mgb",
    produktstrategie: "prod",
    marketing: "mkt",
    launch_marketing_investition: "launch",
    wachstum_expansion: "growth",
    investition_strategie: "invest",
    technologie_digitalisierung: "tech",
    reifephase: "maturity",
    erneuerung_exit: "renewal",
  };
  return map[category] ?? category.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
}

function normalizeItemKey(itemKey: string): string {
  return itemKey.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
}

function responseFormKey(questionnaireType: string, category: string | null): string {
  const q = normalizeItemKey(questionnaireType);
  const c = normalizeCategory(category);
  return `${q}_${c}`;
}

function compareFormKeys(a: string, b: string): number {
  // Keep a predictable order: fb1, fb2, fb3, fb4, fb5 then alpha.
  const rank = (v: string) =>
    v.startsWith("fb1_") ? 1 :
    v.startsWith("fb2_") ? 2 :
    v.startsWith("fb3_") ? 3 :
    v.startsWith("fb4_") ? 4 :
    v.startsWith("fb5_") ? 5 : 99;
  return rank(a) - rank(b) || a.localeCompare(b);
}
