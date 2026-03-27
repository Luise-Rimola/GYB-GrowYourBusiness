import { prisma } from "@/lib/prisma";

function excerptJson(json: unknown, max = 600): string {
  try {
    const s = JSON.stringify(json);
    return s.length <= max ? s : `${s.slice(0, max)}…`;
  } catch {
    return "";
  }
}

export async function runIntegratedInsightAnalysis(
  companyId: string,
  locale: "de" | "en"
): Promise<string> {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  const apiUrl = settings?.llmApiUrl?.trim();
  const apiKey = settings?.llmApiKey?.trim();
  const model = settings?.llmModel?.trim() || "gpt-4o-mini";
  if (!apiUrl) {
    throw new Error(
      locale === "de"
        ? "LLM-API nicht konfiguriert. Bitte unter Einstellungen API-URL und ggf. Key setzen."
        : "LLM API not configured in Settings."
    );
  }

  const [objects, kpiRows, marketingRows] = await Promise.all([
    prisma.knowledgeObject.findMany({
      where: { source: { companyId } },
      include: { source: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.kpiValue.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.marketingAction.findMany({
      where: { companyId },
      orderBy: { actionDate: "desc" },
      take: 35,
    }),
  ]);

  const latestByKey = new Map<string, (typeof kpiRows)[0]>();
  for (const row of kpiRows) {
    if (!latestByKey.has(row.kpiKey)) latestByKey.set(row.kpiKey, row);
  }
  const kpis = [...latestByKey.values()].slice(0, 45);

  const knowledgeLines = objects.map((o) => {
    const src = o.source?.title ?? "?";
    return `- [${o.type}/${o.status}] ${o.title} (Quelle: ${src}, confidence ${o.confidence})\n  Inhalt: ${excerptJson(o.contentJson)}`;
  });

  const kpiLines = kpis.map((k) => {
    const pe = k.periodEnd ? k.periodEnd.toISOString().slice(0, 10) : "—";
    return `- ${k.kpiKey} = ${k.value} (confidence ${k.confidence}, Stand ${pe})`;
  });

  const actionLines = marketingRows.map((a) => {
    const cat = a.category ?? "—";
    return `- ${a.actionDate.toISOString().slice(0, 10)} [${cat}] ${a.description}`;
  });

  const systemDe = `Du bist ein strategischer Analyst für ein kleines/mittleres Unternehmen.
Du erhältst drei getrennte Datenbereiche: Wissensobjekte (extrahierte Claims/Benchmarks/Plays/Risiken), aktuelle KPI-Messwerte, und dokumentierte Maßnahmen (Marketing/Operations).
Es gibt KEINE feste technische Verknüpfung zwischen den Zeilen — deine Aufgabe ist, inhaltliche Zusammenhänge, Lücken und Widersprüche zu erkennen.

Antworte auf Deutsch in Markdown mit genau diesen Abschnitten:
## Zusammenhänge
(Bullet points: welche Maßnahmen und KPIs zu welchen Wissensobjekten passen könnten; plausible Ursache-Wirkung)

## Lücken & Risiken
(Was fehlt, was unsicher ist, wo Daten dünn sind)

## Widersprüche
(Falls vorhanden; sonst kurz „keine offensichtlichen Widersprüche“)

## Empfohlene nächste Schritte
(3–5 konkrete, priorisierte Punkte)

Halte dich an die gegebenen Daten; keine erfundenen Zahlen. Wenn wenig Daten vorliegen, sag das klar.`;

  const systemEn = `You are a strategic analyst. You receive knowledge objects, KPI measurements, and logged business measures.
There is no rigid DB link between rows — infer plausible relationships, gaps, and tensions.

Respond in English in Markdown with sections:
## Connections
## Gaps & risks
## Tensions / contradictions
## Recommended next steps (3–5 items)

Stay factual; do not invent numbers. State clearly if data is sparse.`;

  const userPayload =
    locale === "de"
      ? `### Wissensobjekte (${objects.length})\n${knowledgeLines.length ? knowledgeLines.join("\n") : "(keine)"}

### KPI-Werte (${kpis.length} aktuelle Keys)
${kpiLines.length ? kpiLines.join("\n") : "(keine)"}

### Maßnahmen (${marketingRows.length})
${actionLines.length ? actionLines.join("\n") : "(keine)"}`
      : `### Knowledge objects (${objects.length})\n${knowledgeLines.length ? knowledgeLines.join("\n") : "(none)"}

### KPI values (${kpis.length} keys, latest per key)
${kpiLines.length ? kpiLines.join("\n") : "(none)"}

### Measures (${marketingRows.length})
${actionLines.length ? actionLines.join("\n") : "(none)"}`;

  const baseUrl = apiUrl.replace(/\/$/, "");
  const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: locale === "de" ? systemDe : systemEn },
        { role: "user", content: userPayload },
      ],
      temperature: 0.35,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(locale === "de" ? `LLM-Fehler (${res.status}): ${text.slice(0, 400)}` : `LLM error (${res.status})`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(locale === "de" ? "Leere LLM-Antwort." : "Empty LLM response.");
  }
  return content;
}
