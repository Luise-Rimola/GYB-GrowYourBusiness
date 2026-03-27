import { prisma } from "@/lib/prisma";
import { VectorSearchService } from "@/services/vectorSearch";

/** RPA-style company context embedding for advisor chat – combines approved artifacts, profile, KPIs, decisions */
export async function buildCompanyContextForChat(companyId: string): Promise<string> {
  const [profile, artifacts, kpis, decisions] = await Promise.all([
    prisma.companyProfile.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    }),
    prisma.artifact.findMany({
      where: { companyId, approved: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.kpiValue.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.decision.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const parts: string[] = [];

  if (profile?.profileJson && typeof profile.profileJson === "object") {
    parts.push("## Company Profile\n" + JSON.stringify(profile.profileJson, null, 2));
  }

  const artifactSummary = artifacts.map((a) => ({
    type: a.type,
    title: a.title,
    summary: typeof a.contentJson === "object" ? JSON.stringify(a.contentJson).slice(0, 500) + "..." : "",
  }));
  parts.push("## Approved Artifacts\n" + JSON.stringify(artifactSummary, null, 2));

  if (artifacts.length > 0) {
    const fullArtifacts = artifacts.slice(0, 5).map((a) => ({
      type: a.type,
      title: a.title,
      content: a.contentJson,
    }));
    parts.push("## Key Artifact Content\n" + JSON.stringify(fullArtifacts, null, 2));
  }

  if (kpis.length > 0) {
    const kpiSummary = kpis.map((k) => ({ kpiKey: k.kpiKey, value: k.value, periodEnd: k.periodEnd }));
    parts.push("## KPI Values\n" + JSON.stringify(kpiSummary, null, 2));
  }

  if (decisions.length > 0) {
    const decisionSummary = decisions.map((d) => ({
      title: d.title,
      status: d.status,
      summary: d.decisionJson ? JSON.stringify(d.decisionJson).slice(0, 300) : "",
    }));
    parts.push("## Decisions\n" + JSON.stringify(decisionSummary, null, 2));
  }

  return parts.join("\n\n");
}

const MAX_CONTEXT_CHARS = 8000; // Ziel: Prompt bleibt unter Token-Limit
const MAX_RETRIEVAL_CONTEXT_CHARS = 4500;
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

function truncateJson(obj: unknown, maxChars: number): string {
  const s = JSON.stringify(obj);
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars) + '..." (gekürzt)';
}

function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildChunkFingerprints(text: string): string[] {
  const normalized = normalizeForDedup(text);
  if (!normalized) return [];
  const words = normalized.split(" ").filter(Boolean);
  const windows: string[] = [];
  const windowSize = 18;
  for (let i = 0; i + windowSize <= words.length; i += 6) {
    windows.push(words.slice(i, i + windowSize).join(" "));
  }
  if (windows.length === 0 && words.length > 0) {
    windows.push(words.join(" "));
  }
  return windows;
}

function isChunkAlreadyCovered(baseContext: string, chunkText: string): boolean {
  const normalizedBase = normalizeForDedup(baseContext);
  const fingerprints = buildChunkFingerprints(chunkText);
  if (fingerprints.length === 0) return true;

  let matches = 0;
  for (const fp of fingerprints) {
    if (fp.length < 40) continue;
    if (normalizedBase.includes(fp)) matches++;
  }
  const threshold = Math.max(2, Math.floor(fingerprints.length * 0.35));
  return matches >= threshold;
}

async function callEmbeddingApi(params: {
  llmApiUrl: string;
  llmApiKey?: string;
  input: string;
  model?: string;
}): Promise<number[] | null> {
  const baseUrl = params.llmApiUrl.replace(/\/$/, "");
  const embeddingUrl = baseUrl.includes("/v1") ? `${baseUrl}/embeddings` : `${baseUrl}/v1/embeddings`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.llmApiKey) headers["Authorization"] = `Bearer ${params.llmApiKey}`;

  try {
    const res = await fetch(embeddingUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: params.model ?? DEFAULT_EMBEDDING_MODEL,
        input: params.input.slice(0, 6000),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    const embedding = data.data?.[0]?.embedding;
    return Array.isArray(embedding) ? embedding : null;
  } catch {
    return null;
  }
}

async function buildRetrievedKnowledgeContext(params: {
  companyId: string;
  llmApiUrl: string;
  llmApiKey?: string;
  userMessage: string;
  baseContext: string;
}): Promise<{
  context: string;
  sourceIds: string[];
  knowledgeObjectIds: string[];
}> {
  const queryEmbedding = await callEmbeddingApi({
    llmApiUrl: params.llmApiUrl,
    llmApiKey: params.llmApiKey,
    input: params.userMessage,
  });

  if (!queryEmbedding) {
    return { context: "", sourceIds: [], knowledgeObjectIds: [] };
  }

  const matches = await VectorSearchService.findNearestChunks({
    embedding: queryEmbedding,
    limit: 12,
  });

  if (matches.length === 0) {
    return { context: "", sourceIds: [], knowledgeObjectIds: [] };
  }

  const dedupedMatches = matches
    .filter((m) => !isChunkAlreadyCovered(params.baseContext, m.text))
    .slice(0, 6);

  const effectiveMatches = dedupedMatches.length > 0 ? dedupedMatches : matches.slice(0, 4);

  const sourceIds = [...new Set(effectiveMatches.map((m) => m.sourceId))];
  const [sources, objects] = await Promise.all([
    prisma.source.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, title: true, url: true },
    }),
    prisma.knowledgeObject.findMany({
      where: { sourceId: { in: sourceIds } },
      select: { id: true, sourceId: true, title: true, type: true },
      take: 50,
    }),
  ]);

  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const lines = effectiveMatches.map((m, idx) => {
    const source = sourceMap.get(m.sourceId);
    const chunkText = m.text.length > 650 ? `${m.text.slice(0, 650)}...` : m.text;
    return [
      `### Retrieved Chunk ${idx + 1}`,
      `source_id: ${m.sourceId}`,
      `source_title: ${source?.title ?? "Unbekannt"}`,
      `source_url: ${source?.url ?? "-"}`,
      `similarity: ${m.similarity.toFixed(4)}`,
      `text: ${chunkText}`,
    ].join("\n");
  });

  let context = `## Retrieved Knowledge (Vector Search)\n${lines.join("\n\n")}`;
  if (context.length > MAX_RETRIEVAL_CONTEXT_CHARS) {
    context = context.slice(0, MAX_RETRIEVAL_CONTEXT_CHARS) + "\n\n[... Retrieval-Kontext gekürzt]";
  }

  return {
    context,
    sourceIds,
    knowledgeObjectIds: [...new Set(objects.map((o) => o.id))],
  };
}

/** Kontext für Szenario-Evaluierung: kompakt, damit der Prompt nicht zu lang wird */
export async function buildScenarioEvaluationContext(companyId: string): Promise<string> {
  const [profile, artifacts, kpis, decisions, runs] = await Promise.all([
    prisma.companyProfile.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    }),
    prisma.artifact.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.kpiValue.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.decision.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.run.findMany({
      where: { companyId, status: { in: ["complete", "approved"] } },
      include: { steps: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const parts: string[] = [];

  if (profile?.profileJson && typeof profile.profileJson === "object") {
    parts.push("## Profil\n" + truncateJson(profile.profileJson, 1200));
  }

  if (artifacts.length > 0) {
    const artifactContent = artifacts.slice(0, 5).map((a) => ({
      type: a.type,
      title: a.title,
      content: truncateJson(a.contentJson, 400),
    }));
    parts.push("## Artefakte\n" + JSON.stringify(artifactContent));
  }

  if (kpis.length > 0) {
    const kpiSummary = kpis.map((k) => ({ kpiKey: k.kpiKey, value: k.value }));
    parts.push("## KPIs\n" + JSON.stringify(kpiSummary));
  }

  if (decisions.length > 0) {
    const decisionContent = decisions.map((d) => ({
      title: d.title,
      status: d.status,
      summary: truncateJson(d.decisionJson, 200),
    }));
    parts.push("## Decisions\n" + JSON.stringify(decisionContent));
  }

  const runOutputs = runs.flatMap((r) =>
    r.steps
      .filter((s) => s.schemaValidationPassed && s.parsedOutputJson)
      .map((s) => ({
        wf: r.workflowKey,
        step: s.stepKey,
        out: truncateJson(s.parsedOutputJson, 350),
      }))
  );
  if (runOutputs.length > 0) {
    parts.push("## Runs\n" + JSON.stringify(runOutputs.slice(0, 8)));
  }

  let result = parts.join("\n\n");
  if (result.length > MAX_CONTEXT_CHARS) {
    result = result.slice(0, MAX_CONTEXT_CHARS) + "\n\n[... Kontext gekürzt]";
  }
  return result;
}

/**
 * Generate advisor reply using LLM with company context (RPA embedding).
 * Company data is embedded as context; LLM uses training knowledge for industry/benchmark insights.
 * For live web search: integrate Tavily/Serper/Brave API and append results to context.
 */
export async function generateAdvisorReply(
  companyId: string,
  userMessage: string,
  conversationHistory: { role: string; content: string }[]
): Promise<{ content: string; citations: { artifact_ids: string[]; kpi_keys: string[]; source_ids: string[]; knowledge_object_ids: string[] } }> {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  const url = settings?.llmApiUrl?.trim();
  const apiKey = settings?.llmApiKey?.trim();
  const model = settings?.llmModel?.trim() || "gpt-4o-mini";

  if (!url) {
    return {
      content: "LLM-API nicht konfiguriert. Bitte in Einstellungen konfigurieren.",
      citations: { artifact_ids: [], kpi_keys: [], source_ids: [], knowledge_object_ids: [] },
    };
  }

  const companyContext = await buildCompanyContextForChat(companyId);
  const retrieval = await buildRetrievedKnowledgeContext({
    companyId,
    llmApiUrl: url,
    llmApiKey: apiKey,
    userMessage,
    baseContext: companyContext,
  });
  const [artifacts, kpis] = await Promise.all([
    prisma.artifact.findMany({ where: { companyId, approved: true }, take: 10 }),
    prisma.kpiValue.findMany({ where: { companyId }, take: 20 }),
  ]);

  const systemPrompt = `Du bist ein Unternehmensberater. Nutze primär die bereitgestellten Unternehmensdaten und den Retrieval-Kontext.
Wenn Informationen fehlen oder unklar sind, sage das explizit und stelle eine kurze Rückfrage.
Gib praxisnahe, umsetzbare Empfehlungen mit kurzer Priorisierung.
Nutze externe/branchenbezogene Aussagen nur als allgemeine Orientierung und kennzeichne Unsicherheit.
Wenn Retrieval-Kontext vorhanden ist, beziehe dich auf source_id(s) aus dem Kontext.`;

  const contextBlock = [
    `## Unternehmensdaten (RPA-Embedding)\n${companyContext}`,
    retrieval.context,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextBlock },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const baseUrl = url.replace(/\/$/, "");
  const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      content: `LLM-Fehler (${res.status}): ${errText.slice(0, 150)}`,
      citations: { artifact_ids: [], kpi_keys: [], source_ids: [], knowledge_object_ids: [] },
    };
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "Keine Antwort erhalten.";

  return {
    content,
    citations: {
      artifact_ids: artifacts.map((a) => a.id),
      kpi_keys: [...new Set(kpis.map((k) => k.kpiKey))],
      source_ids: retrieval.sourceIds,
      knowledge_object_ids: retrieval.knowledgeObjectIds,
    },
  };
}
