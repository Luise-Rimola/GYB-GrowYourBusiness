import { fetchApi } from "@/lib/apiClient";

/**
 * Browser: POST /api/llm/complete mit sicherem JSON-Parsing (kein Hängen bei HTML-/Fehlerseiten).
 *
 * @deprecated Für Workflow-Schritte mit Run-Kontext immer `executeRunStepOrThrow` aus
 * `@/lib/runStepExecuteClient` nutzen (einheitlicher `/api/run-step/execute`-Pfad).
 */
export async function postLlmComplete(
  prompt: string,
  init?: { signal?: AbortSignal }
): Promise<string> {
  const res = await fetchApi("/api/llm/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal: init?.signal,
  });

  const text = await res.text();
  let data: { content?: string; error?: string };
  try {
    data = text.trim() ? (JSON.parse(text) as typeof data) : {};
  } catch {
    throw new Error(
      res.ok
        ? "Ungültige JSON-Antwort vom Server."
        : `Server-Fehler (${res.status}): ${text.slice(0, 280)}`
    );
  }

  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  if (typeof data.content !== "string") {
    throw new Error(data.error ?? "Antwort enthielt keinen Text (content).");
  }
  return data.content;
}
