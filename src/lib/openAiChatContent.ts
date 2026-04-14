/**
 * Normalizes OpenAI-compatible chat/completions JSON into a single assistant string.
 * Handles multipart content, array segments (GPT-5 / Responses-style), reasoning models, legacy `choices[0].text`.
 */
function textFromContentPart(x: unknown): string {
  if (typeof x === "string") return x;
  if (x != null && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.content === "string") return o.content;
    if (o.type === "text" && typeof o.text === "string") return o.text;
  }
  return "";
}

export function extractAssistantTextFromChatCompletion(data: unknown): string {
  const d = data as {
    choices?: Array<{ message?: Record<string, unknown>; text?: string }>;
  };

  const choice0 = d.choices?.[0] as { message?: Record<string, unknown>; text?: string } | undefined;
  const msg = choice0?.message;
  const raw = msg?.content;
  let content = "";
  if (typeof raw === "string") {
    content = raw;
  } else if (raw != null && typeof raw === "object" && Array.isArray((raw as { parts?: unknown }).parts)) {
    const parts = (raw as { parts: Array<{ text?: string }> }).parts;
    content = parts.map((p) => p.text ?? "").join("");
  } else if (Array.isArray(raw)) {
    content = raw.map((x) => textFromContentPart(x) || JSON.stringify(x)).join("");
  }

  if (!content.trim() && msg && typeof msg === "object") {
    for (const k of ["reasoning_content", "reasoning", "refusal"] as const) {
      const v = msg[k];
      if (typeof v === "string" && v.trim()) {
        content = v;
        break;
      }
    }
  }
  if (!content.trim() && typeof choice0?.text === "string") {
    content = choice0.text;
  }
  return content;
}
