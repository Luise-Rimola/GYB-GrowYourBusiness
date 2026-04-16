/**
 * Node's global fetch uses undici with conservative defaults. Slow providers (e.g. Kimi)
 * can exceed the default headers/body window and fail with UND_ERR_HEADERS_TIMEOUT before
 * our AbortSignal fires — surfacing as "no request" in provider consoles.
 */
import { Agent, fetch as undiciFetch } from "undici";

import { LLM_UPSTREAM_FETCH_MS } from "@/lib/llmClientTimeouts";

const llmUpstreamAgent = new Agent({
  connectTimeout: 120_000,
  headersTimeout: LLM_UPSTREAM_FETCH_MS,
  bodyTimeout: LLM_UPSTREAM_FETCH_MS,
});

export function fetchLlmUpstream(
  url: string | URL,
  init?: Parameters<typeof undiciFetch>[1]
): ReturnType<typeof undiciFetch> {
  return undiciFetch(url, {
    ...init,
    dispatcher: llmUpstreamAgent,
  });
}
