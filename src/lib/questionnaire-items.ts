/**
 * Hilfsfunktionen für tabellarische Speicherung von Fragebogen-Antworten.
 * Jeder Indikator wird als eigene Zeile in QuestionnaireResponseItem gespeichert.
 */

import { prisma } from "@/lib/prisma";

type ItemValue = string | number;

/** Flacht verschachtelte Objekte (a.A1, b.B1, c.C1, d.D1 …) zu flachen Keys */
function flattenFb1(responses: {
  a?: Record<string, unknown>;
  b?: Record<string, unknown>;
  c?: Record<string, unknown>;
  d?: Record<string, unknown>;
}) {
  const items: Array<{ key: string; value: ItemValue }> = [];
  for (const block of [responses.a, responses.b, responses.c, responses.d]) {
    if (!block) continue;
    for (const [k, v] of Object.entries(block)) {
      if (v !== null && v !== undefined && v !== "") {
        items.push({ key: k, value: v as ItemValue });
      }
    }
  }
  return items;
}

/** Flacht FB2-Struktur (dq.DQ1, ev.EV1, ...) zu flachen Keys */
function flattenFb2(responses: {
  dq?: Record<string, unknown>;
  ev?: Record<string, unknown>;
  tr?: Record<string, unknown>;
  cf?: Record<string, unknown>;
  cl?: Record<string, unknown>;
  open?: Record<string, unknown>;
}) {
  const items: Array<{ key: string; value: ItemValue }> = [];
  for (const block of [responses.dq, responses.ev, responses.tr, responses.cf, responses.cl, responses.open]) {
    if (!block) continue;
    for (const [k, v] of Object.entries(block)) {
      if (v !== null && v !== undefined) {
        items.push({ key: k, value: v as ItemValue });
      }
    }
  }
  return items;
}

/** Flacht FB3-Struktur */
function flattenFb3(responses: {
  dq?: Record<string, unknown>;
  ev?: Record<string, unknown>;
  tr?: Record<string, unknown>;
  cf?: Record<string, unknown>;
  cl?: Record<string, unknown>;
  us?: Record<string, unknown>;
  tam?: Record<string, unknown>;
  comp?: Record<string, unknown>;
  fit?: Record<string, unknown>;
  gov?: Record<string, unknown>;
  open?: Record<string, unknown>;
}) {
  const items: Array<{ key: string; value: ItemValue }> = [];
  for (const block of [responses.dq, responses.ev, responses.tr, responses.cf, responses.cl, responses.us, responses.tam, responses.comp, responses.fit, responses.gov, responses.open]) {
    if (!block) continue;
    for (const [k, v] of Object.entries(block)) {
      if (v !== null && v !== undefined) {
        items.push({ key: k, value: v as ItemValue });
      }
    }
  }
  return items;
}

/** Flacht FB4 (Vergleich + Interview) */
function flattenFb4(responses: {
  us?: Record<string, unknown>;
  tam?: Record<string, unknown>;
  open?: Record<string, unknown>;
  comp?: Record<string, unknown>;
  fit?: Record<string, unknown>;
  gov?: Record<string, unknown>;
  interview?: Record<string, unknown>;
}) {
  const items: Array<{ key: string; value: ItemValue }> = [];
  for (const block of [responses.us, responses.tam, responses.open, responses.comp, responses.fit, responses.gov, responses.interview]) {
    if (!block) continue;
    for (const [k, v] of Object.entries(block)) {
      if (v !== null && v !== undefined) {
        items.push({ key: k, value: v as ItemValue });
      }
    }
  }
  return items;
}

/** FB5 Abschluss: Akzeptanz & Nutzung im Alltag */
function flattenFb5(responses: {
  acc?: Record<string, unknown>;
  open?: Record<string, unknown>;
}) {
  const items: Array<{ key: string; value: ItemValue }> = [];
  for (const block of [responses.acc, responses.open]) {
    if (!block) continue;
    for (const [k, v] of Object.entries(block)) {
      if (v !== null && v !== undefined && v !== "") {
        items.push({ key: k, value: v as ItemValue });
      }
    }
  }
  return items;
}

export async function createQuestionnaireItems(
  responseId: string,
  questionnaireType: "fb1" | "fb2" | "fb3" | "fb4" | "fb5",
  responsesJson: Record<string, unknown>
) {
  const items =
    questionnaireType === "fb1"
      ? flattenFb1(
          responsesJson as {
            a?: Record<string, unknown>;
            b?: Record<string, unknown>;
            c?: Record<string, unknown>;
            d?: Record<string, unknown>;
          }
        )
      : questionnaireType === "fb2"
        ? flattenFb2(responsesJson as Parameters<typeof flattenFb2>[0])
        : questionnaireType === "fb3"
          ? flattenFb3(responsesJson as Parameters<typeof flattenFb3>[0])
          : questionnaireType === "fb4"
            ? flattenFb4(responsesJson as Parameters<typeof flattenFb4>[0])
            : flattenFb5(responsesJson as Parameters<typeof flattenFb5>[0]);

  const delegate = (prisma as any).questionnaireResponseItem;
  if (delegate?.createMany) {
    await delegate.createMany({
      data: items.map(({ key, value }: { key: string; value: ItemValue }) => ({
        responseId,
        itemKey: key,
        valueNum: typeof value === "number" ? value : null,
        valueStr: typeof value === "string" ? value : null,
      })),
    });
    return;
  }

  // Raw fallback (Prisma client missing model delegate)
  const { randomUUID } = await import("crypto");
  const executeRaw = (prisma as any).$executeRaw?.bind(prisma);
  if (!executeRaw) {
    throw new Error("Prisma $executeRaw not available for questionnaireResponseItem raw fallback.");
  }

  for (const { key, value } of items) {
    const id = randomUUID();
    const valueNum = typeof value === "number" ? value : null;
    const valueStr = typeof value === "string" ? value : null;
    try {
      await executeRaw`
        INSERT INTO "QuestionnaireResponseItem"
          ("id","responseId","itemKey","valueNum","valueStr")
        VALUES
          (${id}, ${responseId}, ${key}, ${valueNum}, ${valueStr})
      `;
    } catch {
      // Ignore potential unique-constraint races.
    }
  }
}
