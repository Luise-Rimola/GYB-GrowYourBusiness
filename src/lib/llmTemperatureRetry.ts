/**
 * Some OpenAI-compatible models only allow a fixed temperature (often 1).
 * Retry once with temperature: 1 when the API rejects the requested value.
 */
import { LLM_UPSTREAM_FETCH_MS } from "@/lib/llmClientTimeouts";
import { fetchLlmUpstream } from "@/lib/llmUpstreamFetch";

const TEMPERATURE_REJECT_RE = /invalid temperature|only 1 is allowed|temperature\s+must\s+be/i;

/** Transient network-/socket-Fehler, die bei erneutem Versuch meistens wegsind. */
const TRANSIENT_NETWORK_RE =
  /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|ENOTFOUND|UND_ERR_SOCKET|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|socket hang up|other side closed|Connect Timeout|network/i;

/** Kleiner zufälliger Jitter, damit parallele Worker nicht synchron retryen. */
function jitter(ms: number): number {
  return Math.round(ms * (0.8 + Math.random() * 0.4));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientNetworkError(err: unknown): boolean {
  if (!err) return false;
  const walk = (node: unknown, depth = 0): boolean => {
    if (!node || depth > 4) return false;
    const e = node as { message?: unknown; code?: unknown; cause?: unknown; name?: unknown };
    const bag = [e.message, e.code, e.name]
      .map((v) => (typeof v === "string" ? v : ""))
      .join(" | ");
    if (bag && TRANSIENT_NETWORK_RE.test(bag)) return true;
    if (e.cause) return walk(e.cause, depth + 1);
    return false;
  };
  return walk(err);
}

function upstreamSignal(existing?: AbortSignal): AbortSignal | undefined {
  if (existing) return existing;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(LLM_UPSTREAM_FETCH_MS);
  }
  return undefined;
}

function logUpstreamStart(chatUrl: string, body: Record<string, unknown>): void {
  try {
    const u = new URL(chatUrl);
    const model = typeof body.model === "string" ? body.model : "?";
    console.info("[llm-upstream] POST", { host: u.host, path: u.pathname, model });
  } catch {
    console.info("[llm-upstream] POST (could not parse URL)");
  }
}

/**
 * Führt `fetchLlmUpstream` mit Retry auf transiente Netzwerkfehler aus
 * ("fetch failed", ECONNRESET, UND_ERR_SOCKET, Body/Headers-Timeouts, …).
 * Fehler auf HTTP-Ebene (4xx/5xx) werden NICHT retryed — darum kümmert sich
 * der aufrufende Code (Temperature-Fallback, Kontext/Prompt).
 */
async function fetchLlmUpstreamWithRetry(
  chatUrl: string,
  init: Parameters<typeof fetchLlmUpstream>[1] & { signalFactory?: () => AbortSignal | undefined },
  maxAttempts = 4,
): Promise<Response> {
  let lastErr: unknown = null;
  const delaysMs = [1_000, 3_000, 8_000]; // steigend, max ~12 s Gesamtwartezeit
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const signal = init.signalFactory ? init.signalFactory() : init.signal;
      const { signalFactory: _drop, ...rest } = init;
      void _drop;
      const res = await fetchLlmUpstream(chatUrl, {
        ...rest,
        ...(signal ? { signal } : {}),
      });
      return res as unknown as Response;
    } catch (err) {
      lastErr = err;
      const transient = isTransientNetworkError(err);
      const hasMore = attempt < maxAttempts - 1;
      if (!transient || !hasMore) {
        throw err;
      }
      const wait = jitter(delaysMs[Math.min(attempt, delaysMs.length - 1)]);
      try {
        const u = new URL(chatUrl);
        console.warn(
          `[llm-upstream] transient error on attempt ${attempt + 1}/${maxAttempts} — retrying in ${wait}ms`,
          { host: u.host, error: err instanceof Error ? err.message : String(err) },
        );
      } catch {
        console.warn(`[llm-upstream] transient error — retrying in ${wait}ms`);
      }
      await sleep(wait);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? "fetch failed"));
}

export async function fetchChatCompletionWithTemperatureRetry(
  chatUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  outerSignal?: AbortSignal
): Promise<Response> {
  logUpstreamStart(chatUrl, body);
  let res = await fetchLlmUpstreamWithRetry(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signalFactory: () => upstreamSignal(outerSignal),
  });
  if (res.ok) return res as unknown as Response;

  const errText = await res.text();
  if (res.status === 400 && TEMPERATURE_REJECT_RE.test(errText)) {
    logUpstreamStart(chatUrl, { ...body, temperature: 1 });
    res = await fetchLlmUpstreamWithRetry(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, temperature: 1 }),
      signalFactory: () => upstreamSignal(outerSignal),
    });
    return res as unknown as Response;
  }

  return new Response(errText, { status: res.status, statusText: res.statusText });
}
