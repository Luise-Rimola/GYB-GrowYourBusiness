import { readFile } from "fs/promises";
import { join } from "path";
import { extractText, getDocumentProxy } from "unpdf";
import { prisma } from "@/lib/prisma";
import { evaluateCompanyIndicatorRules } from "@/lib/indicatorMappingRulesEngine";
import { TextCorrectionService, type ExtractedCorrection } from "@/services/textCorrection";
import { VectorSearchService } from "@/services/vectorSearch";

const EXTRACTION_PROMPT = `Extract knowledge objects from the following document text. Return a JSON array of objects. Each object must have:
- type: "claim" | "benchmark" | "play" | "risk_pattern"
- title: short title (max 100 chars)
- content: the extracted content/summary
- confidence: number 0-1

Return ONLY valid JSON array, no other text. Example: [{"type":"claim","title":"...","content":"...","confidence":0.8}]`;

const KPI_EXTRACTION_PROMPT = `Extract KPI values (metrics, numbers) from the following document text. Return a JSON array of objects. Each object must have:
- kpi_key: string – use EXACT keys from kpi_library if provided, else map: revenue→north_star_revenue, mrr, customers→new_customers, cac, ltv, conversion_rate→conversion_rate_primary, churn→logo_churn_rate, burn_rate→burn_rate_net, runway→runway_months, gross_margin→gross_margin_pct, contribution_margin→contribution_margin_pct
- value: number
- period: optional ISO date string (YYYY-MM) if identifiable, else null
- confidence: number 0-1

Return ONLY valid JSON array, no other text. Example: [{"kpi_key":"north_star_revenue","value":50000,"period":"2024-01","confidence":0.8}]`;

const MARKETING_ACTION_EXTRACTION_PROMPT = `Extract marketing/business measures (Maßnahmen) from the document. Return a JSON array. Each object must have:
- action_date: ISO date string (YYYY-MM-DD) if identifiable, else YYYY-MM-01
- description: short description of the measure (max 200 chars)
- category: "marketing"|"sales"|"product"|"ads"|"ops"|"other"
- related_kpi_keys: optional string array — library KPI keys this measure targets (e.g. cac, north_star_revenue, logo_churn_rate). Use [] if unclear.

Return ONLY valid JSON array. Example: [{"action_date":"2024-01-15","description":"Google Ads Kampagne gestartet","category":"marketing","related_kpi_keys":["cac"]}]`;
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

async function extractTextFromFile(url: string): Promise<string | null> {
  if (!url.startsWith("/uploads/")) return null;
  const filepath = join(process.cwd(), "public", url.replace(/^\//, ""));
  const ext = url.split(".").pop()?.toLowerCase();
  let buffer: Buffer;
  try {
    buffer = await readFile(filepath);
  } catch (err) {
    console.error("[knowledge] readFile failed:", filepath, err);
    throw new Error(`Datei nicht gefunden: ${url}`);
  }

  if (ext === "pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return text ?? null;
    } catch (err) {
      console.error("[knowledge] unpdf extractText failed:", err);
      throw new Error(`PDF konnte nicht gelesen werden: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (["txt", "csv"].includes(ext ?? "")) {
    return buffer.toString("utf-8");
  }
  return null;
}

async function callLlmForExtraction(prompt: string, companyId: string): Promise<string> {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  const url = settings?.llmApiUrl?.trim();
  const apiKey = settings?.llmApiKey?.trim();
  const model = settings?.llmModel?.trim() || "gpt-4o-mini";
  if (!url) throw new Error("LLM-API nicht konfiguriert. Bitte in Einstellungen konfigurieren.");

  const baseUrl = url.replace(/\/$/, "");
  const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`LLM-API Fehler (${res.status})`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
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

export const KnowledgeService = {
  async processSource(sourceId: string, companyId: string): Promise<{ chunks: number; objects: number; kpisCreated?: number; actionsCreated?: number; error?: string }> {
    const source = await prisma.source.findUnique({ where: { id: sourceId } });
    if (!source?.url) return { chunks: 0, objects: 0, error: "Quelle oder URL fehlt" };

    const text = await extractTextFromFile(source.url);
    if (!text || text.trim().length < 10) {
      if (!source.url.startsWith("http")) {
        return { chunks: 0, objects: 0, error: "Text konnte nicht extrahiert werden (nur PDF/TXT unterstützt)" };
      }
      return { chunks: 0, objects: 0, error: "Web-URLs werden noch nicht verarbeitet" };
    }

    await prisma.knowledgeChunk.deleteMany({ where: { sourceId } });
    const chunkSize = 8000;
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    const createdChunkIds: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const created = await prisma.knowledgeChunk.create({
        data: {
          sourceId,
          chunkIndex: i,
          text: chunks[i],
          metadataJson: { charCount: chunks[i].length },
        },
      });
      createdChunkIds.push(created.id);
    }

    // Best effort: create vector embeddings for chunk retrieval (RAG).
    // Ingestion must not fail if embedding endpoint is unavailable.
    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    const apiUrl = settings?.llmApiUrl?.trim();
    const apiKey = settings?.llmApiKey?.trim();
    if (apiUrl && createdChunkIds.length > 0) {
      for (let i = 0; i < createdChunkIds.length; i++) {
        const embedding = await callEmbeddingApi({
          llmApiUrl: apiUrl,
          llmApiKey: apiKey,
          input: chunks[i],
        });
        if (!embedding) continue;
        try {
          await VectorSearchService.saveChunkEmbedding({
            chunkId: createdChunkIds[i],
            embedding,
          });
        } catch (embeddingWriteErr) {
          console.warn("[knowledge] writing embedding failed:", embeddingWriteErr);
        }
      }
    }

    const prompt = `${EXTRACTION_PROMPT}\n\nDocument text:\n${text.slice(0, 12000)}`;
    let content: string;
    try {
      content = await callLlmForExtraction(prompt, companyId);
    } catch (err) {
      await prisma.knowledgeSource.updateMany({
        where: { sourceId },
        data: { ingestionStatus: "new" },
      });
      throw err;
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const arr = jsonMatch ? (JSON.parse(jsonMatch[0]) as Array<{ type?: string; title?: string; content?: string; confidence?: number }>) : [];
    const validTypes = ["claim", "benchmark", "play", "risk_pattern"] as const;

    await prisma.knowledgeObject.deleteMany({ where: { sourceId } });
    let objectsCreated = 0;
    for (const item of arr) {
      const type = validTypes.includes(item.type as (typeof validTypes)[number]) ? (item.type as (typeof validTypes)[number]) : "claim";
      const title = String(item.title ?? "Unbenannt").slice(0, 200);
      const contentStr = String(item.content ?? "").slice(0, 5000);
      const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0.5));
      await prisma.knowledgeObject.create({
        data: {
          type,
          title,
          contentJson: { content: contentStr },
          sourceId,
          evidenceScoreJson: {},
          evidenceGrade: "C",
          confidence,
          status: "draft",
          version: 1,
        },
      });
      objectsCreated++;
    }

    await prisma.knowledgeSource.updateMany({
      where: { sourceId },
      data: { ingestionStatus: "processed" },
    });

    // Extract KPI values from document and create KpiValue records
    let kpisCreated = 0;
    try {
      const kpiPrompt = `${KPI_EXTRACTION_PROMPT}\n\nDocument text:\n${text.slice(0, 12000)}`;
      const kpiContent = await callLlmForExtraction(kpiPrompt, companyId);
      const kpiMatch = kpiContent.match(/\[[\s\S]*\]/);
      const kpiArr = kpiMatch ? (JSON.parse(kpiMatch[0]) as Array<{ kpi_key?: string; value?: number; period?: string | null; confidence?: number }>) : [];
      for (const item of kpiArr) {
        const key = String(item.kpi_key ?? "").trim().toLowerCase().replace(/\s+/g, "_");
        if (!key || typeof item.value !== "number") continue;
        const periodEnd = item.period ? (() => {
          const d = new Date(item.period + "-01");
          return isNaN(d.getTime()) ? null : d;
        })() : new Date();
        const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0.6));
        await prisma.kpiValue.create({
          data: {
            companyId,
            kpiKey: key,
            value: item.value,
            confidence,
            periodEnd: periodEnd instanceof Date ? periodEnd : new Date(),
            qualityJson: { completeness: 0.8, freshness: 1, consistency: 1, traceability: "document_extraction" },
            sourceRefJson: { type: "document_extraction", sourceId },
          },
        });
        kpisCreated++;
      }
      if (kpisCreated > 0) {
        await evaluateCompanyIndicatorRules(companyId, "kpi_update");
        const kpiSet = await prisma.companyKpiSet.findFirst({ where: { companyId }, orderBy: { version: "desc" } });
        const selectedKpis = (kpiSet?.selectedKpisJson as string[] | null) ?? [];
        const newKeys = kpiArr.map((i) => String(i.kpi_key ?? "").trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean);
        const toAdd = newKeys.filter((k) => !selectedKpis.includes(k));
        if (toAdd.length > 0 && kpiSet) {
          await prisma.companyKpiSet.update({
            where: { id: kpiSet.id },
            data: { selectedKpisJson: [...selectedKpis, ...toAdd] },
          });
        }
      }
    } catch (kpiErr) {
      console.warn("[knowledge] KPI extraction failed:", kpiErr);
    }

    // Extract marketing actions (Maßnahmen) from document
    let actionsCreated = 0;
    if ("marketingAction" in prisma && typeof (prisma as { marketingAction?: { create: (args: unknown) => Promise<unknown> } }).marketingAction?.create === "function") {
      try {
        const actionPrompt = `${MARKETING_ACTION_EXTRACTION_PROMPT}\n\nDocument text:\n${text.slice(0, 12000)}`;
        const actionContent = await callLlmForExtraction(actionPrompt, companyId);
        const actionMatch = actionContent.match(/\[[\s\S]*\]/);
        const actionArr = actionMatch
          ? (JSON.parse(actionMatch[0]) as Array<{
              action_date?: string;
              description?: string;
              category?: string;
              related_kpi_keys?: string[];
            }>)
          : [];
        for (const item of actionArr) {
          const desc = String(item.description ?? "").trim().slice(0, 500);
          if (!desc) continue;
          const d = item.action_date ? new Date(item.action_date) : new Date();
          if (isNaN(d.getTime())) continue;
          const category = ["marketing", "sales", "product", "ads", "ops", "other"].includes(String(item.category ?? "")) ? item.category : "other";
          const relatedKpiKeys = Array.isArray(item.related_kpi_keys)
            ? [...new Set(item.related_kpi_keys.map((k) => String(k).trim().toLowerCase().replace(/-/g, "_")).filter(Boolean))]
            : [];
          await prisma.marketingAction.create({
            data: {
              companyId,
              actionDate: d,
              description: desc,
              category: category ?? "other",
              sourceRefJson: {
                type: "document_extraction",
                sourceId,
                ...(relatedKpiKeys.length > 0 ? { relatedKpiKeys } : {}),
              },
            },
          });
          actionsCreated++;
        }
      } catch (actionErr) {
        console.warn("[knowledge] Marketing action extraction failed:", actionErr);
      }
    }

    return { chunks: chunks.length, objects: objectsCreated, kpisCreated, actionsCreated };
  },

  async processTextUpdate(text: string, companyId: string): Promise<{
    kpisCreated: number;
    actionsCreated: number;
    batchId?: string;
    correctionsApplied?: unknown[];
    needsRerun?: boolean;
    recommendedWorkflows?: string[];
    error?: string;
  }> {
    const { randomUUID } = await import("crypto");
    const batchId = randomUUID();

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Extract from this German or English text. Be generous – extract KPIs, measures, AND corrections.

1) kpis: KPI values – revenue (Umsatz, verdient, €), customers (Kunden), margin (Marge). Map to: north_star_revenue, new_customers, gross_margin_pct, etc. Parse "100e" or "100€" as 100.
2) actions: Business measures (Maßnahmen) – e.g. "Mittagskarte reduziert", "Kampagne gestartet". Category: marketing|sales|product|ads|ops|other. Each action may include related_kpi_keys: string[] (KPI keys from the kpis list or standard keys like cac, north_star_revenue) when the measure clearly targets those metrics; else [].
3) corrections: User CORRECTIONS/overrides – when they say "X ist Y, aber ich denke Z" or "ändern von Y auf Z". Each: field_key ("personnel_costs"|"rent"|"menu_cost"|"revenue"|"other"), new_value (number), old_value (if mentioned), month ("YYYY-MM" only if explicit), scope ("all_months"|"single_month"|"overall"), change_magnitude ("small"|"large" – "large" for personnel_costs, rent, menu_cost as they cascade).

Dates: ONLY use date from text if EXPLICITLY written. Else use today: ${today}.

Examples:
"Mittagskarte reduziert, 100€" → kpis:[{kpi_key:"north_star_revenue",value:100,period:"${today.slice(0, 7)}"}], actions:[{action_date:"${today}",description:"Mittagskarte reduziert",category:"product",related_kpi_keys:["north_star_revenue"]}]
"Personalkosten sind 7000, ich denke 4000" → corrections:[{field_key:"personnel_costs",new_value:4000,old_value:7000,scope:"all_months",change_magnitude:"large"}]

Return ONLY valid JSON: { "kpis": [...], "actions": [...], "corrections": [...] }`;

    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    const apiUrl = settings?.llmApiUrl?.trim();
    const apiKey = settings?.llmApiKey?.trim();
    const model = settings?.llmModel?.trim() || "gpt-4o-mini";
    if (!apiUrl) return { kpisCreated: 0, actionsCreated: 0, error: "LLM-API nicht konfiguriert." };

    const baseUrl = apiUrl.replace(/\/$/, "");
    const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: `${prompt}\n\nText:\n${text.slice(0, 8000)}` }],
        temperature: 0.2,
      }),
    });
    if (!res.ok) return { kpisCreated: 0, actionsCreated: 0, error: `LLM-API Fehler (${res.status})` };
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as {
          kpis?: Array<{ kpi_key?: string; value?: number; period?: string; confidence?: number }>;
          actions?: Array<{ action_date?: string; description?: string; category?: string; related_kpi_keys?: string[] }>;
          corrections?: ExtractedCorrection[];
        })
      : { kpis: [], actions: [], corrections: [] };
    const kpis = parsed.kpis ?? [];
    const actions = parsed.actions ?? [];
    const corrections = (parsed.corrections ?? []).filter(
      (c) =>
        c?.field_key &&
        typeof c.new_value === "number" &&
        ["personnel_costs", "rent", "menu_cost", "revenue", "other"].includes(String(c.field_key))
    ) as ExtractedCorrection[];

    let kpisCreated = 0;
    for (const item of kpis) {
      const key = String(item.kpi_key ?? "").trim().toLowerCase().replace(/\s+/g, "_");
      if (!key || typeof item.value !== "number") continue;
      const periodEnd = item.period ? (() => { const d = new Date(item.period + "-01"); return isNaN(d.getTime()) ? new Date() : d; })() : new Date();
      const confidence = Math.min(1, Math.max(0, Number(item.confidence) || 0.6));
      await prisma.kpiValue.create({
        data: {
          companyId,
          kpiKey: key,
          value: item.value,
          confidence,
          periodEnd,
          qualityJson: { completeness: 1, freshness: 1, consistency: 1, traceability: "text_input" },
          sourceRefJson: { type: "text_input", batchId, inputPreview: text.slice(0, 100) },
        },
      });
      kpisCreated++;
    }
    if (kpisCreated > 0) {
      await evaluateCompanyIndicatorRules(companyId, "kpi_update");
    }

    let actionsCreated = 0;
    if ("marketingAction" in prisma && typeof (prisma as { marketingAction?: { create: (args: unknown) => Promise<unknown> } }).marketingAction?.create === "function") {
      for (const item of actions) {
        const desc = String(item.description ?? "").trim().slice(0, 500);
        if (!desc) continue;
        const d = item.action_date ? new Date(item.action_date) : new Date();
        if (isNaN(d.getTime())) continue;
        const category = ["marketing", "sales", "product", "ads", "ops", "other"].includes(String(item.category ?? "")) ? item.category : "other";
        const relatedKpiKeys = Array.isArray(item.related_kpi_keys)
          ? [...new Set(item.related_kpi_keys.map((k) => String(k).trim().toLowerCase().replace(/-/g, "_")).filter(Boolean))]
          : [];
        await prisma.marketingAction.create({
          data: {
            companyId,
            actionDate: d,
            description: desc,
            category: category ?? "other",
            sourceRefJson: {
              type: "text_input",
              batchId,
              inputPreview: text.slice(0, 100),
              ...(relatedKpiKeys.length > 0 ? { relatedKpiKeys } : {}),
            },
          },
        });
        actionsCreated++;
      }
    }

    let applied: { artifactType: string; artifactId: string; changes: string[] }[] = [];
    let needsRerun = false;
    let recommendedWorkflows: string[] = [];
    if (corrections.length > 0) {
      const correctionResult = await TextCorrectionService.applyCorrections(companyId, corrections);
      applied = correctionResult.applied;
      needsRerun = correctionResult.needsRerun;
      recommendedWorkflows = correctionResult.recommendedWorkflows;
    }

    return {
      kpisCreated,
      actionsCreated,
      batchId,
      correctionsApplied: applied,
      needsRerun,
      recommendedWorkflows,
    };
  },

  async publishVersion(versionLabel: string) {
    const activeObjects = await prisma.knowledgeObject.findMany({
      where: { status: "active" },
    });
    await prisma.knowledgeVersion.updateMany({
      where: { status: "active" },
      data: { status: "archived" },
    });
    return prisma.knowledgeVersion.create({
      data: {
        versionLabel,
        status: "active",
        includedObjectIdsJson: activeObjects.map((obj) => obj.id),
      },
    });
  },

  async addContradiction(params: {
    knowledgeObjectIdA: string;
    knowledgeObjectIdB: string;
    reason: string;
    severity: "low" | "medium" | "high";
  }) {
    return prisma.knowledgeContradiction.create({
      data: {
        knowledgeObjectIdA: params.knowledgeObjectIdA,
        knowledgeObjectIdB: params.knowledgeObjectIdB,
        reason: params.reason,
        severity: params.severity,
      },
    });
  },
};
