/**
 * Browser: POST /api/llm/complete mit sicherem JSON-Parsing (kein Hängen bei HTML-/Fehlerseiten).
 */
export async function postLlmComplete(
  prompt: string,
  init?: { signal?: AbortSignal }
): Promise<string> {
  const res = await fetch("/api/llm/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
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
