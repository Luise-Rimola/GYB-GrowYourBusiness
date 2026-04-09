import { prisma } from "@/lib/prisma";

const MAX_WEB_BYTES = 400_000;
const WEB_FETCH_MS = 12_000;

/** Öffentliche http(s)-URLs ohne offensichtliches SSRF-Risiko. */
export function isSafePublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost")) return false;
    if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function fetchPublicWebsiteText(url: string): Promise<string | null> {
  if (!isSafePublicHttpUrl(url)) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), WEB_FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "BusinessDSS-Enrichment/1.0 (company profile)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_WEB_BYTES) return null;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const stripped = text
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.slice(0, 12_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const SEARCH_MS = 12_000;
const MAX_SEARCH_CHARS = 10_000;

/** Brave Search API — optional `BRAVE_SEARCH_API_KEY` in env. */
async function fetchBraveWebSnippets(query: string): Promise<string | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!key) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), SEARCH_MS);
  try {
    const u = new URL("https://api.search.brave.com/res/v1/web/search");
    u.searchParams.set("q", query);
    u.searchParams.set("count", "10");
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      web?: { results?: Array<{ title?: string; description?: string; url?: string }> };
    };
    const results = data.web?.results ?? [];
    if (results.length === 0) return null;
    const lines = results.map((r) => `${r.title ?? ""}\n${r.description ?? ""}\n${r.url ?? ""}`).join("\n---\n");
    return lines.slice(0, MAX_SEARCH_CHARS);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** HTML-Suche (Fallback, kein API-Key). Kann je nach Umgebung leer bleiben. */
async function fetchDuckDuckGoHtmlSnippet(query: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEARCH_MS);
  try {
    const u = new URL("https://html.duckduckgo.com/html/");
    u.searchParams.set("q", query);
    const res = await fetch(u.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BusinessDSS/1.1; +company-enrichment)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, MAX_SEARCH_CHARS) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type LinkedInSearchResult = {
  text: string | null;
  source: "brave" | "ddg" | "none";
};

/**
 * Läuft immer (unabhängig von der Firmen-Website): Websuche mit Fokus LinkedIn / Team.
 * Reihenfolge: Brave (wenn API-Key) → DuckDuckGo-HTML.
 */
export async function fetchLinkedInSearchContext(
  companyName: string,
  location: string
): Promise<LinkedInSearchResult> {
  const qBase = `${companyName.trim()} ${location.trim()}`.replace(/\s+/g, " ").trim();
  if (!qBase) return { text: null, source: "none" };
  const searchQuery = `${qBase} linkedin company employees leadership`;
  const brave = await fetchBraveWebSnippets(searchQuery);
  if (brave) return { text: brave, source: "brave" };
  const ddg = await fetchDuckDuckGoHtmlSnippet(searchQuery);
  if (ddg) return { text: ddg, source: "ddg" };
  return { text: null, source: "none" };
}

export type PublicFinanceSearchResult = {
  text: string | null;
  source: "brave" | "ddg" | "none";
};

/**
 * Öffentliche Finanz-/Register-Hinweise (z. B. northdata) für Umsatz/Bilanz-Kontext.
 * Nur öffentlich zugängliche Snippets, keine Login- oder Scraping-Umgehung.
 */
export async function fetchPublicFinanceSearchContext(
  companyName: string,
  location: string
): Promise<PublicFinanceSearchResult> {
  const qBase = `${companyName.trim()} ${location.trim()}`.replace(/\s+/g, " ").trim();
  if (!qBase) return { text: null, source: "none" };
  const searchQuery =
    `${qBase} northdata umsatz bilanz jahresabschluss bundesanzeiger handelsregister`;
  const brave = await fetchBraveWebSnippets(searchQuery);
  if (brave) return { text: brave, source: "brave" };
  const ddg = await fetchDuckDuckGoHtmlSnippet(searchQuery);
  if (ddg) return { text: ddg, source: "ddg" };
  return { text: null, source: "none" };
}

function isEmptyVal(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return !Number.isFinite(v);
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Füllt nur leere Felder; bestehende manuelle Einträge bleiben. */
export function mergePreferExistingEmpty(
  base: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined) continue;
    const cur = out[k];
    if (isEmptyVal(cur)) {
      out[k] = v;
    }
  }
  return out;
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  return t;
}

export function parseEnrichmentJson(content: string): Record<string, unknown> {
  const raw = stripJsonFence(content);
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid JSON object");
  }
  return parsed as Record<string, unknown>;
}

const ENRICHMENT_KEYS = [
  "offer",
  "usp",
  "customers",
  "competitors",
  "target_market",
  "growth_challenge",
  "differentiators",
  "sales_channels",
  "constraints",
  "additional_notes",
  "funding_status",
  "acquisition_channels",
  "retention_churn",
  "lead_time",
  "business_state",
  "market_reach",
  "legal_structure",
  "stage",
  "team_size",
  "years_in_business",
  "revenue_last_month",
  "marketing_spend",
  "fixed_costs",
  "variable_costs",
  "aov",
  "production_steps",
  "team",
] as const;

function buildEnrichmentPrompt(
  locale: string,
  companyName: string,
  website: string,
  location: string,
  websiteText: string | null,
  linkedInSearchText: string | null,
  publicFinanceSearchText: string | null
): string {
  const lang = locale.startsWith("de") ? "German" : "English";
  const siteBlock = websiteText
    ? `\nPublic website text excerpt (may be incomplete):\n${websiteText}\n`
    : "\n(No company website was provided or fetched — that is OK; other sources below still apply.)\n";

  const linkedInBlock = linkedInSearchText
    ? `\nWeb search snippets (LinkedIn / company / people — independent of the website field; may be noisy):\n${linkedInSearchText}\n`
    : "\n(No web search text was retrieved — still use company name + location; for team use only widely verifiable public facts or [].)\n";

  const financeBlock = publicFinanceSearchText
    ? `\nPublic finance/register snippets (e.g. northdata / Bundesanzeiger / Handelsregister; may be noisy):\n${publicFinanceSearchText}\n`
    : "\n(No public finance/register snippets retrieved. Keep financial fields conservative and avoid speculation.)\n";

  return `You help fill a structured business profile. Language for string values: ${lang}.

Company name: ${companyName || "unknown"}
Website: ${website || "—"}
Location: ${location || "—"}
${siteBlock}${linkedInBlock}${financeBlock}

Return a single JSON object with ONLY these keys (omit keys you cannot infer; use null for unknown numbers):
${ENRICHMENT_KEYS.map((k) => `"${k}"`).join(", ")}

Rules:
- Strings: concise, factual; no marketing fluff beyond what is typical for a profile form.
- market_reach: one of "local", "national", "international".
- stage: one of "pre_revenue", "early_revenue", "growth", "scaling".
- legal_structure: one of "", "sole_proprietorship", "partnership", "llc", "corporation", "other" or empty string.
- business_state: one of idea, first_research, investor_search, launch, young_business, growing_business, scaling_business, established — or empty string.
- team_size, years_in_business: numbers only if reasonably inferable, else null.
- revenue_last_month, marketing_spend, fixed_costs, variable_costs, aov: numbers or null (do not guess wildly).
- For financial numbers, use only clearly attributable public data points; if ambiguous, return null.
- production_steps: short bullet-style text or empty string.
- team: JSON array of { "name": string, "role": string, "skills": string }. This is NOT tied to whether a website URL was given.
  Priority: (1) web search snippets above for this exact company (including public finance/register snippets for financial fields); (2) public website excerpt if any; (3) only if the company is unambiguous and facts are widely documented, minimal public leadership — otherwise []. Never invent names, titles, or financial values.

Output JSON only, no markdown.`;
}

async function callLlmJson(
  chatUrl: string,
  headers: Record<string, string>,
  model: string,
  prompt: string
): Promise<string> {
  const payloadWithJsonMode = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" as const },
  };

  let res = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payloadWithJsonMode),
  });

  if (!res.ok) {
    const firstErr = await res.text();
    const unsupportedJsonMode = /response_format|json_object|unsupported|unknown/i.test(firstErr);
    if (unsupportedJsonMode) {
      res = await fetch(chatUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });
    } else {
      throw new Error(`LLM ${res.status}: ${firstErr.slice(0, 300)}`);
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (data.error?.message) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content ?? "";
}

export async function runCompanyEnrichment(args: {
  companyId: string;
  companyName: string;
  website: string;
  location: string;
  locale: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { companyId, companyName, website, location, locale } = args;
  const trimmedName = companyName.trim();
  const trimmedWeb = website.trim();
  const trimmedLoc = location.trim();

  if (!trimmedName) {
    return { ok: false, error: "Firmenname fehlt." };
  }

  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
  });
  const url = settings?.llmApiUrl?.trim();
  const apiKey = settings?.llmApiKey?.trim();
  const model = settings?.llmModel?.trim() || "gpt-4o-mini";

  if (!url) {
    return {
      ok: false,
      error:
        "LLM-API nicht konfiguriert. Bitte unter Einstellungen URL und API-Key eintragen, damit öffentliche Daten zusammengefasst werden können.",
    };
  }

  const [websiteText, linkedInCtx, publicFinanceCtx] = await Promise.all([
    trimmedWeb && isSafePublicHttpUrl(trimmedWeb) ? fetchPublicWebsiteText(trimmedWeb) : Promise.resolve(null as string | null),
    fetchLinkedInSearchContext(trimmedName, trimmedLoc),
    fetchPublicFinanceSearchContext(trimmedName, trimmedLoc),
  ]);

  const baseUrl = url.replace(/\/$/, "");
  const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const prompt = buildEnrichmentPrompt(
    locale,
    trimmedName,
    trimmedWeb,
    trimmedLoc,
    websiteText,
    linkedInCtx.text,
    publicFinanceCtx.text
  );
  let content: string;
  try {
    content = await callLlmJson(chatUrl, headers, model, prompt);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "LLM-Anfrage fehlgeschlagen" };
  }

  let llmPartial: Record<string, unknown>;
  try {
    llmPartial = parseEnrichmentJson(content);
  } catch {
    return { ok: false, error: "Die KI-Antwort war kein gültiges JSON." };
  }

  const latestProfile = await prisma.companyProfile.findFirst({
    where: { companyId },
    orderBy: { version: "desc" },
  });
  const latestSession = await prisma.intakeSession.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  const sessionObj = (latestSession?.answersJson as Record<string, unknown>) ?? {};
  const profileObj = (latestProfile?.profileJson as Record<string, unknown>) ?? {};

  const base: Record<string, unknown> = {
    ...sessionObj,
    ...profileObj,
    company_name: trimmedName,
    website: trimmedWeb,
    location: trimmedLoc,
  };

  const merged = mergePreferExistingEmpty(base, llmPartial);
  merged.enrichment = {
    source: "llm_web",
    at: new Date().toISOString(),
    websiteFetched: Boolean(websiteText),
    websiteExcerptChars: websiteText?.length ?? 0,
    linkedInSearchSource: linkedInCtx.source,
    linkedInSearchChars: linkedInCtx.text?.length ?? 0,
    publicFinanceSearchSource: publicFinanceCtx.source,
    publicFinanceSearchChars: publicFinanceCtx.text?.length ?? 0,
  };

  const filled = [
    merged.company_name,
    merged.offer,
    merged.revenue_last_month,
    merged.location,
    merged.usp,
    merged.website,
  ].filter(Boolean).length;
  const completenessScore = Math.min(1, filled / 6 + 0.2);

  await prisma.company.update({
    where: { id: companyId },
    data: { name: trimmedName },
  });

  await prisma.companyProfile.create({
    data: {
      companyId,
      version: (latestProfile?.version ?? 0) + 1,
      profileJson: merged as object,
      completenessScore,
    },
  });

  if (latestSession) {
    await prisma.intakeSession.update({
      where: { id: latestSession.id },
      data: { answersJson: merged as object },
    });
  } else {
    await prisma.intakeSession.create({
      data: {
        companyId,
        status: "draft",
        answersJson: merged as object,
      },
    });
  }

  return { ok: true };
}
