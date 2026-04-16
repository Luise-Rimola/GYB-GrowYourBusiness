/**
 * Some OpenAI-compatible models only allow a fixed temperature (often 1).
 * Retry once with temperature: 1 when the API rejects the requested value.
 */
import { LLM_UPSTREAM_FETCH_MS } from "@/lib/llmClientTimeouts";
import { fetchLlmUpstream } from "@/lib/llmUpstreamFetch";

const TEMPERATURE_REJECT_RE = /invalid temperature|only 1 is allowed|temperature\s+must\s+be/i;

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

export async function fetchChatCompletionWithTemperatureRetry(
  chatUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  outerSignal?: AbortSignal
): Promise<Response> {
  const signal = upstreamSignal(outerSignal);
  logUpstreamStart(chatUrl, body);
  let res = await fetchLlmUpstream(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  if (res.ok) return res as unknown as Response;

  const errText = await res.text();
  if (res.status === 400 && TEMPERATURE_REJECT_RE.test(errText)) {
    const retrySig = upstreamSignal(outerSignal);
    logUpstreamStart(chatUrl, { ...body, temperature: 1 });
    res = await fetchLlmUpstream(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, temperature: 1 }),
      ...(retrySig ? { signal: retrySig } : {}),
    });
    return res as unknown as Response;
  }

  return new Response(errText, { status: res.status, statusText: res.statusText });
}
