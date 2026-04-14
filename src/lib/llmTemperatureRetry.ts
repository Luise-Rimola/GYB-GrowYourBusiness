/**
 * Some OpenAI-compatible models only allow a fixed temperature (often 1).
 * Retry once with temperature: 1 when the API rejects the requested value.
 */
import { LLM_UPSTREAM_FETCH_MS } from "@/lib/llmClientTimeouts";

const TEMPERATURE_REJECT_RE = /invalid temperature|only 1 is allowed|temperature\s+must\s+be/i;

function upstreamSignal(existing?: AbortSignal): AbortSignal | undefined {
  if (existing) return existing;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(LLM_UPSTREAM_FETCH_MS);
  }
  return undefined;
}

export async function fetchChatCompletionWithTemperatureRetry(
  chatUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  outerSignal?: AbortSignal
): Promise<Response> {
  const signal = upstreamSignal(outerSignal);
  let res = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });
  if (res.ok) return res;

  const errText = await res.text();
  if (res.status === 400 && TEMPERATURE_REJECT_RE.test(errText)) {
    const retrySig = upstreamSignal(outerSignal);
    res = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, temperature: 1 }),
      ...(retrySig ? { signal: retrySig } : {}),
    });
    return res;
  }

  return new Response(errText, { status: res.status, statusText: res.statusText });
}
